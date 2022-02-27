sequelize-bakery
================

A test model builder inspired by Django's [model-bakery](https://github.com/model-bakers/model_bakery).

Usage
-----
```javascript
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false },
}, {});

const Account = sequelize.define('Account', { ... }, {});

User.hasMany(Account);
Account.belongsTo(User);

const account1 = await build(Account); // automatically creates a user filled with random data
const account2 = await build(Account, { User: { username: 'overriden' } }); // creates a user with fields explicitly set
```

Limitations
-----------
Currently only creating BelongsTo relations, hasMany relations are not yet supported.
