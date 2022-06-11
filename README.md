sequelize-bakery
================

![test CI](https://github.com/jrocketfingers/sequelize-bakery/actions/workflows/test.yml/badge.svg)

A test model builder inspired by Django's [model-bakery](https://github.com/model-bakers/model_bakery). Allows you to focus your test setup by only specifying fields relevant to your test, and letting the bakery build out everything else.

Problem
-------
You have a deep hierarchy of models, and test setups are tedious because of it.
```javascript
User.belongsTo(Cohort);
Account.belongsTo(User);
Wallet.belongsTo(Account);

test('should be muddied by needless setup', async () => {
	const cohort = await Cohort.create({ ... }); // irrelevant
	const user = await User.create({ ..., cohort }); // irrelevant
	const account = await Account.create({ ..., user }); // irrelevant
	const wallet = await Wallet.create({ ..., account, balance: 500000 }); // we only care about the balance here

	// ... assertions ...
});
```

With `sequelize-bakery`, you can jump straight to target model creation.

```javascript
const { build } = require('sequelize-bakery');

test('should be clear and to the point', async () => {
	const wallet = await build(Wallet);
	// ... assertions ...
}
```

If you want to specify any of the fields explicitly:
```javascript
const wallet = await build(Wallet, { balance: 5000000 } });
```

If you want to go deep with your specifications:
```javascript
const wallet = await build(Wallet, { Account: { User: { username: 'overriden' } } });
```

If you want to explicity supply an existing model, for example, to have two generated models belong to the same parent:
```javascript
const wallet1 = await build(Wallet);
const wallet2 = await build(Wallet, { Account: wallet1.account });
```

### Nullable fields and default values
Nullable fields will be not be generated, unless they have a `defaultValue` set, or you specify the `fillOptional` as true in the third parameter to the `build` call.

```javascript
const user = build(User, {}, { fillOptional: true });
```

In case you want to allow bakery to generate some fields, but not others, you can supply an array of allowed fields instead.

```javascript
const user = build(User, {}, { fillOptional: ['dateOfBirth'] });
```

### Destroying built models in test teardowns
`sequelize-bakery` tracks all instances it creates. Calling `destroyAllBuilt` in test teardowns will automatically destroy all instances built by Sequelize.
```javascript
const { destroyAllBuilt } = require('sequelize-bakery');

afterEach(async () => {
    await destroyAllBuilt();
});
```

### Overriding generators
In case your models require specialized conversion, you can override the underlying generators. The first parameter is
is the type of your column in underlying SQL dialect. (e.g. VARCHAR)
```javascript
const { overrideGenerator } = require('sequlize-bakery');

overrideGenerator('DECIMAL', () => new CustomBigNumber(faker.datatype.number().toString()));
```

In addition, if your column has sequelize validation (not constraint!), you can use the same override with the first parameter
being the sequelize validator.
```javascript
overrideGenerator('isEmal', () => `${faker.name.firstName()}@yahoo.com`);
```

If a column has sequelize validation, the specialized generators take precedence. Some are built in, such as isEmail, isIPv4, etc.

**Warning:** `overrideGenerator` overrides both SQL typemap and validator typemap. This overlap behavior is not thoroughly tested
and might cause some problems! Be suspect of this if you encounter odd issues while using `overrideGenerator`.

Limitations
-----------
Currently only creating BelongsTo relations, hasMany relations are not yet supported.
