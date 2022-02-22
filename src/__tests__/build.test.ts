import {
	Sequelize, DataTypes, Model, InferAttributes,
	InferCreationAttributes, HasManyGetAssociationsMixin,
	BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, ModelStatic,
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
	declare public email: string;

	declare public createdAt: Date;
	declare public updatedAt: Date;

	declare public getAccounts: HasManyGetAssociationsMixin<Account>;

	declare public accounts?: Account[];
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
			allowNull: false,
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		updatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
		}
	},
	{
		tableName: 'users',
		sequelize,
	}
);

class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
	declare public id: number;
	declare public name: string;
	declare public userId: number;

	declare public user?: User;
	declare public getUser: BelongsToGetAssociationMixin<User>;
	declare public setUser: BelongsToSetAssociationMixin<User, Account['userId']>;
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

	declare public account?: Account;
	declare public getAccount: BelongsToGetAssociationMixin<Account>;
	declare public setAccount: BelongsToSetAssociationMixin<Wallet, Wallet['accountId']>;
}

Wallet.init(
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
		accountId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		}
	},
	{
		tableName: 'wallets',
		sequelize,
	}
);

User.hasMany(Account, { foreignKey: 'userId' });
Account.belongsTo(User, { foreignKey: 'userId' });
Account.hasMany(Wallet, { foreignKey: 'accountId' });
Wallet.belongsTo(Account, { foreignKey: 'accountId' });

beforeAll(async () => {
	await sequelize.sync({ force: true });
});

describe('just create', () => {
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
		expect(instance!.user).not.toBeNull();
	});

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

		expect(instance!.user!.username).toEqual('overriden');
	});

	test('can override an association directly by providing an entire object', async () => {
		const preDefinedUser = await User.create({
			username: 'custom user',
			email: 'test@gmail.com',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const instance = await build(Account, { User: preDefinedUser });

		expect(instance.user).toEqual(preDefinedUser);
	});
});

describe('create nested', () => {
	test('can create a deep hierarchy', async () => {
		const instance = await build(Wallet);

		expect(instance.account).not.toBeNull();
		expect(instance.account!.user).not.toBeNull();		
	});

	test('can override a skip-level in hierarchy', async () => {
		const instance = await build(Wallet, { Account: { User: { username: 'overriden' } } });

		expect(instance.account?.user?.username).toEqual('overriden');
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
})