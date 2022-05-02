import { MongooseModule } from '@nestjs/mongoose';
import { CoffeesService } from './coffees.service';
import { Injectable, Module } from '@nestjs/common';
import {
  CoffeesController,
  CoffeesMongoController,
} from './coffees.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coffee } from './entities/coffee.entity';
import {
  Coffee as CoffeeMongo,
  coffeeSchema,
} from './entities/coffee-mongo.entity';
import { Flavor } from './entities/flavor.entity';
import { Event } from '../events/entities/event.entity';
import {
  Event as EventMongo,
  eventSchema,
} from '../events/entities/event-mongo.entity';
import { COFFEE_BRANDS } from './coffees.constants';
import { Connection } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import coffeesConfig from './coffees.config';

class ConfigService {}
class DevelopmentConfigService {}
class ProductionConfigService {}

@Injectable()
class CoffeeBrandsFactory {
  create() {
    return ['buddy brew', 'nescafe', 'starbucks'];
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Coffee, Flavor, Event]),
    ConfigModule.forFeature(coffeesConfig),
    MongooseModule.forFeature([
      { name: CoffeeMongo.name, schema: coffeeSchema },
      { name: EventMongo.name, schema: eventSchema },
    ]),
  ],
  controllers: [CoffeesController, CoffeesMongoController],
  providers: [
    CoffeesService,
    {
      provide: ConfigService,
      useClass:
        process.env.NODE_ENV === 'development'
          ? DevelopmentConfigService
          : ProductionConfigService,
    },
    CoffeeBrandsFactory,
    {
      provide: COFFEE_BRANDS,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      useFactory: async (connection: Connection) => {
        const coffeeBrands = await Promise.resolve(['buddy brew', 'nescafe']);
        return coffeeBrands;
      },
      inject: [Connection],
    },
  ],
  exports: [CoffeesService],
})
export class CoffeesModule {}
