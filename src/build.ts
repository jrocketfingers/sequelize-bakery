import 'module-alias/register'
import { Association, CreationAttributes, Model, ModelStatic } from 'sequelize';

import faker from 'faker';

const typemap = new Map<String, Function>([
	['INTEGER', faker.datatype.number],
	['BIGINT', faker.datatype.number],
	['STRING', faker.datatype.string],
	['TEXT', faker.datatype.string],
	['DATETIME', faker.datatype.datetime],
	['DATE', faker.datatype.datetime],
]);

interface BuildOptions {
	fillOptional?: (boolean | Array<String>);
}

export async function buildData<T extends Model<any, any>>(model: ModelStatic<T>, data: Record<string, any> = {}, options: BuildOptions = {}): Promise<any> {
	const fakeData: Record<string, any> = data;
	const associations: Record<string, Association> = Object.values(model.associations).reduce((associationMap, association) => {
		return { ...associationMap, [association.foreignKey]: association };
	}, {});

	await Promise.all(Object.entries(model.rawAttributes).map(async ([attrName, attr]) => {
		if(!attr.references) { // the attribute is NOT an association

			// this ugly conditional simply says: if the field is optional, and we're getting
			// no requests that it should be filled, skip generating data; can be simpler
			if (attr.allowNull === true) { 
				if (options.fillOptional === undefined
					|| typeof options.fillOptional === "boolean" && options.fillOptional === false
					|| options.fillOptional instanceof Array && !options.fillOptional.includes(attrName)) {
					return;
				}
			}

			if (fakeData[attrName]) {
				return; // skip when data exists
			}

			if (attr.defaultValue !== undefined) {
				fakeData[attrName] = attr.defaultValue;
				return;
			}
			// generate fake data according to the field type
			// take the part before the length spec; e.g. VARCHAR from VARCHAR(255)
			const type = attr.type.constructor.name.split('(')[0];

			// skip generating IDs
			if (attrName === 'id') {
				return;
			}

			const generator = typemap.get(type);
			if (generator === undefined) {
				throw new Error(`sequelize-bakery does not currently support ${type}`);
			}

			if (typeof generator !== 'function') {
				throw new Error(`sequelize-bakery broke; ${type} builder is not a function`);
			}

			fakeData[attrName] = generator();
		} else {
			const association = associations[attrName];
			if(fakeData[association.as] instanceof Model) { // association.as is the association name
				fakeData[association.as.toLowerCase()] = fakeData[association.as];
				fakeData[attrName] = fakeData[association.as].id;
			} else {
				const associatedModel = association.target;
				const instance = await build(associatedModel, fakeData[association.as]);
				fakeData[association.as.toLowerCase()] = instance;
				delete fakeData[association.as];
				fakeData[attrName] = instance.get('id');
			}
		}
	}));

	return fakeData as CreationAttributes<T>;
}

export async function build<T extends Model<any, any>>(model: ModelStatic<T>, data: Record<string, any> = {}, options: BuildOptions = {}): Promise<T> {
	const fakeData = await buildData(model, data, options);
	const instance: T = await model.create({ ...fakeData });
	Object.assign(instance, fakeData); // pre-load instances of the associations

	return instance;
}
