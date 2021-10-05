import 'module-alias/register'
import { Model, ModelCtor } from 'sequelize';

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

export async function build<T extends Model<any, any>>(model: ModelCtor<T>, data: Record<string, any>): Promise<T> {
    const ownModelData: Record<string, any> = {};
    const nestedModels: Record<string, any> = {};

	Object.entries(data).forEach(async ([key, value]) => {
		if (isPrimitive(value)) {
			ownModelData[key] = value;
		} else {
			if (model.associations[key] === undefined) {
				throw new Error(`Nested value ${key} is not an association for the ${model.name} model.`);
			}

			const associatedModel = model.associations[key].target
			nestedModels[key] = await build(associatedModel, value);
		}
	});

	const fakeData: Record<string, any> = {};
	Object.entries(model.rawAttributes).forEach(([attrName, attr]) => {
		if(attr.references !== undefined) {
			return;
		}

		if (ownModelData[attrName]) { // if there's predefined data
			fakeData[attrName] = ownModelData[attrName]; // use that
		} else {
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
		}
	});

    const instance: T = await model.create({ ...fakeData }); // this doesn't
	const i = await model.findOne(); // this has the ID

	Object.entries(nestedModels).forEach(async ([attr, model]) => {
		const setter = `set${attr}`;
		let typescriptHack = instance as typeof instance & { [key: string]: (i: typeof instance) => void };
		await typescriptHack[setter as keyof T](model);
	});

	return instance.save();
}