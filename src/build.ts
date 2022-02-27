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

function isPrimitive(value: any) {
    return Object(value) !== value;
}

export async function buildData<T extends Model<any, any>>(model: ModelStatic<T>, data: Record<string, any> = {}): Promise<any> {
	const fakeData: Record<string, any> = data;
	const associations: Record<string, Association> = Object.values(model.associations).reduce((associationMap, association) => {
		return { ...associationMap, [association.foreignKey]: association };
	}, {});

	await Promise.all(Object.entries(model.rawAttributes).map(async ([attrName, attr]) => {
		if(!attr.references) { // the attribute is NOT an association
			if(fakeData[attrName]) {
				return; // skip when data exists
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
				throw new Error(`${type} is not defined in the builder typemap`);
			}

			if (typeof generator !== 'function') {
				throw new Error(`${type} builder is not a function`);
			}
			fakeData[attrName] = generator();
		} else {
			const association = associations[attrName];
			if(fakeData[association.as] instanceof Model) { // association.as is the association name
				fakeData[association.as.toLowerCase()] = fakeData[association.as];
				fakeData[attrName] = fakeData[association.as].id;
			} else {
				if (data[attrName] instanceof Model) {
					fakeData[attrName] = data[attrName];
				} else {
					if (!(association instanceof Association)) { // associationId has attr.references set
						return;
					}
					const associatedModel = association.target;
					const instance = await build(associatedModel, fakeData[association.as]);
					fakeData[association.as.toLowerCase()] = instance;
					delete fakeData[association.as];
					fakeData[attrName] = instance.get('id');
				}
			}
		}
	}));

	return fakeData as CreationAttributes<T>;
}

export async function build<T extends Model<any, any>>(model: ModelStatic<T>, data: Record<string, any> = {}): Promise<T> {
	const fakeData = await buildData(model, data);
	const instance: T = await model.create({ ...fakeData });
	Object.assign(instance, fakeData); // pre-load instances of the associations

	return instance;
}
