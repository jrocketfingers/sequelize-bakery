sequelize-bakery
================

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
const build = require('sequelize-bakery');

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

Limitations
-----------
Currently only creating BelongsTo relations, hasMany relations are not yet supported.
