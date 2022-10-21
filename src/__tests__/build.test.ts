import {
	Sequelize, DataTypes, Model, InferAttributes,
	InferCreationAttributes, HasManyGetAssociationsMixin,
	BelongsToGetAssociationMixin, BelongsToSetAssociationMixin,
} from "sequelize";
import { build } from '@app/build';

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'db.sqlite3',
	logging: false,
});

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
	declare public id?: number;
	declare public username: string;
	declare public email?: string;
	declare public dateOfBirth?: Date;
	declare public initials?: string;

	declare public createdAt?: Date;
	declare public updatedAt?: Date;
	declare public deletedAt?: Date;

	declare public getAccounts: HasManyGetAssociationsMixin<Account>;

	declare public Accounts?: Account[];
}

User.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		username: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		dateOfBirth: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		initials: {
			type: DataTypes.STRING(3),
			allowNull: true
		}
	},
	{
		tableName: 'users',
		paranoid: true,
		sequelize,
	}
);

class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
	declare public id: number;
	declare public name: string;
	declare public userId: number;
	declare public managerId: number;

	declare public User?: User;
	declare public Manager?: User;
	declare public getUser: BelongsToGetAssociationMixin<User>;
	declare public setUser: BelongsToSetAssociationMixin<User, Account['userId']>;

	declare public getManager: BelongsToGetAssociationMixin<User>;
	declare public setManager: BelongsToSetAssociationMixin<User, Account['managerId']>;
}

Account.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		managerId: {
			type: DataTypes.INTEGER,
			allowNull: true,
		}
	},
	{
		tableName: 'accounts',
		sequelize,
	}
);

class Wallet extends Model<InferAttributes<Wallet>, InferCreationAttributes<Wallet>> {
	declare public id: number;
	declare public name: string;
	declare public accountId: number;
	declare public balance: number;

	declare public Account?: Account;
	declare public getAccount: BelongsToGetAssociationMixin<Account>;
	declare public setAccount: BelongsToSetAssociationMixin<Wallet, Wallet['accountId']>;
}

Wallet.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: DataTypes.UUIDV4,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		accountId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		balance: {
			type: DataTypes.DECIMAL,
			allowNull: false,
			defaultValue: 0,
		},
	},
	{
		tableName: 'wallets',
		sequelize,
	}
);

User.hasMany(Account, { foreignKey: 'userId' });
Account.belongsTo(User, { foreignKey: 'userId' });
Account.belongsTo(User, { as: 'Manager', foreignKey: 'managerId' });
Account.hasMany(Wallet, { foreignKey: 'accountId' });
Wallet.belongsTo(Account, { foreignKey: 'accountId' });

beforeAll(async () => {
	await sequelize.sync({ force: true });
});

describe('just create', () => {
	test('use default values when available', async () => {
		const wallet = await build(Wallet);

		expect(wallet.balance).toEqual(0); // wallet has defaultValue set to 0
		expect(wallet.id.toString()).toMatch(/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/)
	});

	test('skip allowNull fields', async () => {
		const user = await build(User);

		expect(user.email).toBeUndefined();
		expect(user.dateOfBirth).toBeUndefined();
	});

	test('skip generating deletedAt fields', async () => {
		const user = await build(User);

		expect(user.deletedAt).toBeUndefined();
	});

	test('generate allowNull fields if requested', async () => {
		const user = await build(User, {}, { fillOptional: true });

		expect(user.email).not.toBeUndefined();
		expect(user.dateOfBirth).not.toBeUndefined();
	});

	test('generate specific allowNull fields if requested', async () => {
		const user = await build(User, {}, { fillOptional: ['dateOfBirth'] });

		expect(user.email).toBeUndefined();
		expect(user.dateOfBirth).not.toBeUndefined();
	});

	test('respect maximum length of variable-length fields', async () => {
		const user = await build(User, {}, { fillOptional: ['initials'] });
		expect(user.initials).toBeDefined();
		expect(user.initials!.length).toBeLessThanOrEqual(3);
	})
});

describe('create with relations', () => {
	test('can create an instance with a belongsTo relation', async () => {
		await build(Account, { User: { username: 'Brock' } });

		const instance = await Account.findOne({
			include: {
				model: User,
				where: {
					username: 'Brock',
				}
			}
		});

		expect(instance).not.toBeNull();
		expect(instance!.User).not.toBeNull();
	});

	test('does not create an allowNull belongsTo relation', async () => {
		const instance = await build(Account);

		expect(instance.managerId).toBeFalsy();
	});

	test('warns if a relation is mistakenly an ID instead of an object', async () => {
		const user = await build(User);
		expect(async () => {
			await build(Account, { User: user.id });
		}).rejects.toThrowError(/You need to supply a Model/);
	})

	// don't have a mechanism just yet
	test.skip('can create an instance with a hasMany relation', async () => {

	});
});

describe('create with overrides', () => {
	test('can override a primitive value', async () => {
		const instance = await build(Account, { name: 'overriden' });

		expect(instance.name).toEqual('overriden');
	});

	test('can override a primitive in a nested, created, association', async () => {
		const instance = await build(Account, { User: { username: 'overriden' } });

		expect(instance!.User!.username).toEqual('overriden');
	});

	test('can override an association directly by providing an entire object', async () => {
		const preDefinedUser = await User.create({
			username: 'custom user',
			email: 'test@gmail.com',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const instance = await build(Account, { User: preDefinedUser });

		expect(instance.User).toEqual(preDefinedUser);
	});

	test('doesn\'t skip allowNull fields that have an entire object supplied', async () => {
		const preDefinedUser = await User.create({
			username: 'custom user',
			email: 'test@gmail.com',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const instance = await build(Account, { Manager: preDefinedUser });

		expect(instance.managerId).toEqual(preDefinedUser.id);
	});

	test('can override an association by providing an ID', async () => {
		const preDefinedUser = await User.create({
			username: 'custom user',
			email: 'test@gmail.com',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const instance = await build(Account, { userId: preDefinedUser.id });

		expect(instance.User?.id).toEqual(preDefinedUser.id);
		expect(instance.User?.username).toEqual(preDefinedUser.username);
		expect(instance.User?.email).toEqual(preDefinedUser.email);
	})
});

describe('create nested', () => {
	test('can create a deep hierarchy', async () => {
		const instance = await build(Wallet);

		expect(instance.Account).not.toBeNull();
		expect(instance.Account!.userId).not.toBeNull();
	});

	test('can override a skip-level in hierarchy', async () => {
		const instance = await build(Wallet, { Account: { User: { username: 'overriden' } } });

		expect(instance.Account?.User?.username).toEqual('overriden');
	});

	test('can share pre-defined models in multiple builders', async () => {
		const user = await build(User);
		await build(Wallet, { Account: { User: user } });
		await build(Wallet, { Account: { User: user } });
		await build(Wallet); // one wallet does _not_ belong to the same user!

		const wallets = await Wallet.findAll({
			include: [{
				model: Account,
				required: true,
				include: [{
					model: User,
					where: { id: user.id },
					required: true,
				}]
			}]
		})

		expect(wallets).toHaveLength(2);
	});
});

describe('create specialized fields', () => {
	test('validators', async () => {
		class ModelWithAllValidators extends Model<InferAttributes<ModelWithAllValidators>, InferCreationAttributes<ModelWithAllValidators>> {
			declare public email?: string;
			declare public ip?: string;
			declare public ipv4?: string;
			declare public ipv6?: string;
			declare public creditCard?: string;
		}

		ModelWithAllValidators.init({
			email: { type: DataTypes.STRING, validate: { isEmail: true } },
			ip: { type: DataTypes.STRING, validate: { isIP: true } },
			ipv4: { type: DataTypes.STRING, validate: { isIPv4: true }},
			ipv6: { type: DataTypes.STRING, validate: { isIPv6: true }},
			creditCard: { type: DataTypes.STRING, validate: { isCreditCard: true }},
		}, { sequelize, tableName: 'model_with_all_validators' });
		await sequelize.sync();

		await build(ModelWithAllValidators);
	});

	test('unsupported validator', async () => {
		class ModelWithUnsupportedValidators extends Model<InferAttributes<ModelWithUnsupportedValidators>, InferCreationAttributes<ModelWithUnsupportedValidators>> {
			declare public random?: string;
		}

		ModelWithUnsupportedValidators.init({
			random: { type: DataTypes.STRING, validate: { isArray: true } },
		}, { sequelize, tableName: 'model_with_unsupported_validators' });
		await sequelize.sync();

		expect(async () => await build(ModelWithUnsupportedValidators)).rejects.toThrowError('sequelize-bakery does not currently support');
	})
});
