import { faker } from '@faker-js/faker';

export const Factory = {
  account(overrides?: Partial<any>) {
    return {
      name: faker.finance.accountName(),
      type: 'CHECKING',
      initialBalance: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
      archived: false,
      ...overrides,
    };
  },

  category(overrides?: Partial<any>) {
    return {
      name: faker.commerce.department(),
      kind: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
      fixedCost: faker.datatype.boolean(),
      ...overrides,
    };
  },

  transaction(overrides?: Partial<any>) {
    return {
      date: faker.date.recent({ days: 30 }),
      amount: faker.number.float({ min: -500, max: 500, fractionDigits: 2 }),
      type: faker.helpers.arrayElement(['INCOME', 'FIXED_COST', 'VARIABLE_EXPENSE']),
      notes: faker.lorem.sentence(),
      ...overrides,
    };
  },

  recurringRule(overrides?: Partial<any>) {
    const startDate = faker.date.past();
    return {
      amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      direction: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
      period: faker.helpers.arrayElement(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
      startDate,
      nextOccurrence: startDate,
      autoPost: true,
      ...overrides,
    };
  },

  budget(overrides?: Partial<any>) {
    return {
      amount: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
      period: 'MONTHLY',
      effectiveFrom: faker.date.past(),
      ...overrides,
    };
  },

  tag(overrides?: Partial<any>) {
    return {
      name: faker.word.noun(),
      color: faker.color.rgb({ format: 'hex' }),
      ...overrides,
    };
  },

  payee(overrides?: Partial<any>) {
    return {
      name: faker.company.name(),
      notes: faker.lorem.sentence(),
      ...overrides,
    };
  },

  savingsGoal(overrides?: Partial<any>) {
    return {
      name: faker.lorem.words(3),
      targetAmount: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
      currentAmount: 0,
      targetDate: faker.date.future(),
      color: faker.color.rgb({ format: 'hex' }),
      ...overrides,
    };
  },
};
