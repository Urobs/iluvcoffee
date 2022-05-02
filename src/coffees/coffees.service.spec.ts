import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import coffeesConfig from './coffees.config';
import { COFFEE_BRANDS } from './coffees.constants';
import { CoffeesService } from './coffees.service';
import { Coffee } from './entities/coffee.entity';
import { Flavor } from './entities/flavor.entity';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
});

class TestConfigService {
  get() {
    return;
  }
}

describe('CoffeesService', () => {
  let service: CoffeesService;
  let coffeeRepository: MockRepository<Coffee>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoffeesService,
        {
          provide: Connection,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Coffee),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Flavor),
          useValue: createMockRepository(),
        },
        {
          provide: COFFEE_BRANDS,
          useValue: ['test'],
        },
        {
          provide: ConfigService,
          useClass: TestConfigService,
        },
        {
          provide: coffeesConfig.KEY,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CoffeesService>(CoffeesService);
    coffeeRepository = createMockRepository<Coffee>();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('findOne', () => {
    describe('when coffee with ID exists', () => {
      it('should return the coffee object', async () => {
        const coffeeId = 1;
        const expectedCoffee = {};

        coffeeRepository.findOne.mockReturnValue(expectedCoffee);
        const coffee = await coffeeRepository.findOne(coffeeId);
        expect(coffee).toEqual(expectedCoffee);
      });
    });
    describe('otherwise', () => {
      it('should throw the NotFoundException', async () => {
        const coffeeId = 1;
        coffeeRepository.findOne.mockReturnValue(undefined);
        try {
          await coffeeRepository.findOne(coffeeId);
        } catch (e) {
          expect(e).toBeInstanceOf(NotFoundException);
          expect(e.message).toEqual(`Coffee with id ${coffeeId} not found`);
        }
      });
    });
  });
});
