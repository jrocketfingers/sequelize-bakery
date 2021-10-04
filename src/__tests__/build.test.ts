import { Sequelize, DataTypes, Optional, Model, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin, ModelCtor } from "sequelize";
import { build } from '@app/build';

const sequelize = new Sequelize('sqlite::memory:');

interface UserAttributes {
	id: number;
	username: string;
	email: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
	public id!: number;
	public username!: string;
	public email!: string;

	public createdAt!: Date;
	public updatedAt!: Date;

	public getAccounts!: HasManyGetAssociationsMixin<Account>;

	public accounts?: Account[];
}

User.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
		},
		username: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
		}
	},
	{
		tableName: 'users',
		sequelize,
	}
);

interface AccountAttributes {
	id: number;
	name: string;
}

interface AccountCreationAttributes extends Optional<AccountAttributes, "id"> {}

class Account extends Model<AccountAttributes, AccountCreationAttributes> {
	public id!: number;
	public name!: string;

	public getUser!: BelongsToGetAssociationMixin<User>;

	public user?: User;
}

Account.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		}
	},
	{
		tableName: 'accounts',
		sequelize,
	}
);

User.hasMany(Account);
Account.belongsTo(User);

test('should build a model with no associations', async () => {

});

test('should build a model with a hasMany association', async () => {

});

test('should build a model with a hasOne association', async () => {

});

test('should build a model with a belongsTo association', async () => {
	await sequelize.sync({ force: true });

	const instance = await build(Account as ModelCtor<Account>, { User: { name: 'Brock' } });
	console.log(instance.toJSON());
	console.log((await instance.getUser()).toJSON());
});
