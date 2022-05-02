import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateCoffeeDto } from '../../src/coffees/dto/create-coffee.dto';
import * as request from 'supertest';
import { CoffeesModule } from '../../src/coffees/coffees.module';
import { MongooseModule } from '@nestjs/mongoose';

describe('[Feature] Coffees - /coffees', () => {
  let app: INestApplication;
  const coffee: CreateCoffeeDto = {
    name: 'Test Coffee',
    brand: 'Test Brand',
    flavors: ['Test Flavor 1', 'Test Flavor 2'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CoffeesModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,
          username: 'postgres',
          password: 'pass123',
          database: 'postgres',
          autoLoadEntities: true,
          synchronize: true,
        }),
        MongooseModule.forRoot('mongodb://localhost:27018/nest-course'),
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  it('Create [POST /]', () => {
    return request(app.getHttpServer())
      .post('/coffees')
      .send(coffee)
      .expect(HttpStatus.CREATED)
      .then(({ body }) => {
        expect(body).toEqual({
          ...coffee,
          id: expect.any(Number),
          description: null,
          recommendations: expect.any(Number),
          flavors: coffee.flavors.map((flavor) => ({
            name: flavor,
            id: expect.any(Number),
          })),
        });
      });
  });
  it('Get all [GET /]', () => {
    return request(app.getHttpServer())
      .get('/coffees')
      .expect(HttpStatus.OK)
      .then(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...coffee,
              id: expect.any(Number),
              flavors: coffee.flavors.map((flavor) => ({
                name: flavor,
                id: expect.any(Number),
              })),
            }),
          ]),
        );
      });
  });
  it('Get one [GET /:id]', async () => {
    const [coffeeFirst] = await (
      await request(app.getHttpServer()).get('/coffees')
    ).body;
    return request(app.getHttpServer())
      .get(`/coffees/${coffeeFirst.id}`)
      .expect(HttpStatus.OK)
      .then(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            ...coffee,
            id: expect.any(Number),
            flavors: coffee.flavors.map((flavor) => ({
              name: flavor,
              id: expect.any(Number),
            })),
          }),
        );
      });
  });
  it('Update one [PATCH /:id]', async () => {
    const [coffeeFirst] = await (
      await request(app.getHttpServer()).get('/coffees')
    ).body;
    return request(app.getHttpServer())
      .patch(`/coffees/${coffeeFirst.id}`)
      .send({
        ...coffee,
        name: 'Updated Coffee',
      })
      .expect(HttpStatus.OK)
      .then(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            ...coffee,
            id: expect.any(Number),
            name: 'Updated Coffee',
            flavors: coffee.flavors.map((flavor) => ({
              name: flavor,
              id: expect.any(Number),
            })),
          }),
        );
      });
  });
  it('Delete one [DELETE /:id]', async () => {
    const [coffeeFirst] = await (
      await request(app.getHttpServer()).get('/coffees')
    ).body;
    return request(app.getHttpServer())
      .delete(`/coffees/${coffeeFirst.id}`)
      .expect(HttpStatus.OK)
      .then(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            brand: coffeeFirst.brand,
            description: coffeeFirst.description,
            name: coffeeFirst.name,
            recommendations: coffeeFirst.recommendations,
            flavors: coffeeFirst.flavors,
          }),
        );
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
