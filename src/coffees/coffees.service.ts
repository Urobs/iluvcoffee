import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { UpdateCoffeeDto } from './dto/update-coffee.dto';
import { Coffee } from './entities/coffee.entity';
import { Coffee as CoffeeMongo } from './entities/coffee-mongo.entity';
import { Flavor } from './entities/flavor.entity';
import { Event } from '../events/entities/event.entity';
import { Event as EventMongo } from '../events/entities/event.entity';
import { COFFEE_BRANDS } from './coffees.constants';
import { ConfigService, ConfigType } from '@nestjs/config';
import coffeesConfig from './coffees.config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection as MongoConnection } from 'mongoose';

@Injectable({})
export class CoffeesService {
  constructor(
    @InjectModel(CoffeeMongo.name)
    private readonly coffeeMongoModel: Model<CoffeeMongo>,
    @InjectConnection() private readonly mongoConnection: MongoConnection,
    @InjectModel(EventMongo.name)
    private readonly eventMongoModel: Model<EventMongo>,
    @InjectRepository(Coffee)
    private readonly coffeeRepository: Repository<Coffee>,
    @InjectRepository(Flavor)
    private readonly flavorRepository: Repository<Flavor>,
    private readonly connection: Connection,
    @Inject(COFFEE_BRANDS) coffeeBrands: string[],
    private readonly configService: ConfigService,
    @Inject(coffeesConfig.KEY)
    private readonly coffeesConfiguration: ConfigType<typeof coffeesConfig>,
  ) {}

  mongoFindAll(paginationQuery: PaginationQueryDto) {
    return this.coffeeMongoModel
      .find()
      .skip(paginationQuery.offset)
      .limit(paginationQuery.limit)
      .exec();
  }

  async mongoFindOne(id: string) {
    const coffee = await this.coffeeMongoModel.findOne({
      _id: id,
    });
    if (!coffee) {
      throw new NotFoundException(`Coffee with id ${id} not found`);
    }
    return coffee;
  }

  async mongoCreate(createCoffeeDto: CreateCoffeeDto) {
    const coffee = new this.coffeeMongoModel(createCoffeeDto);
    return coffee.save();
  }

  async mongoUpdate(id: string, updateCoffeeDto: UpdateCoffeeDto) {
    const coffee = await this.coffeeMongoModel
      .findOneAndUpdate({ _id: id }, { $set: updateCoffeeDto }, { new: true })
      .exec();
    if (!coffee) {
      throw new NotFoundException(`Coffee with id ${id} not found`);
    }
    return coffee;
  }

  async mongoRemove(id: string) {
    const coffee = await this.mongoFindOne(id);
    return coffee.remove();
  }

  async mongoRecommendCoffee(coffee: CoffeeMongo) {
    const session = await this.mongoConnection.startSession();
    session.startTransaction();
    try {
      coffee.recommendations++;

      const recommendEvent = new this.eventMongoModel({
        name: 'recommend_coffee',
        type: 'coffee',
        payload: { coffeeId: coffee._id },
      });

      await recommendEvent.save({ session });
      await coffee.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }

  findAll(paginationQuery: PaginationQueryDto) {
    const { offset, limit } = paginationQuery;
    return this.coffeeRepository.find({
      relations: ['flavors'],
      order: {
        id: 'DESC',
      },
      skip: offset,
      take: limit,
    });
  }

  async findOne(id: number) {
    const coffee = await this.coffeeRepository.findOne(id, {
      relations: ['flavors'],
    });
    if (!coffee) {
      throw new NotFoundException(`Coffee with id ${id} not found`);
    }
    return coffee;
  }

  async create(createCoffeeDto: CreateCoffeeDto) {
    const flavors = await Promise.all(
      createCoffeeDto.flavors.map((flavorName) =>
        this.preloadFlavorByName(flavorName),
      ),
    );

    const coffee = this.coffeeRepository.create({
      ...createCoffeeDto,
      flavors,
    });
    return this.coffeeRepository.save(coffee);
  }

  async update(id: number, updateCoffeeDto: UpdateCoffeeDto) {
    const flavors =
      updateCoffeeDto.flavors &&
      (await Promise.all(
        updateCoffeeDto.flavors.map((flavorName) =>
          this.preloadFlavorByName(flavorName),
        ),
      ));

    const coffee = await this.coffeeRepository.preload({
      id,
      ...updateCoffeeDto,
      flavors,
    });
    if (!coffee) {
      throw new NotFoundException(`Coffee with id ${id} not found`);
    }
    return this.coffeeRepository.save(coffee);
  }

  async remove(id: number) {
    const coffee = await this.findOne(id);
    return this.coffeeRepository.remove(coffee);
  }

  async recommendCoffee(coffee: Coffee) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      coffee.recommendations++;

      const recommendEvent = new Event();
      recommendEvent.name = 'recommend_coffee';
      recommendEvent.type = 'coffee';
      recommendEvent.payload = {
        coffeeId: coffee.id,
      };

      await queryRunner.manager.save(coffee);
      await queryRunner.manager.save(recommendEvent);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async preloadFlavorByName(name: string): Promise<Flavor> {
    const existingFlavor = await this.flavorRepository.findOne({ name: name });
    if (existingFlavor) {
      return existingFlavor;
    }
    return this.flavorRepository.create({ name });
  }
}
