import {
    connect,
    ConnectionOptions,
    Document,
    model,
    Model,
    ModelPopulateOptions,
    Mongoose,
    QueryFindOneAndUpdateOptions,
    Schema
} from 'mongoose';

export class Database {

    private readonly mongoose: Promise<Mongoose>;

    constructor(host: string, port: number, database: string, options?: ConnectionOptions) {
        this.mongoose = connect(`mongodb://${host}:${port}/${database}`, options);
        this.mongoose.then(() => {
            console.log('Connected to MongoDB');
        }).catch(error => {
            console.log(error);
            throw error;
        });
    }

    getConnection(): Promise<Mongoose> {
        return this.mongoose;
    }
}


export class Collection<T extends Document> {
    private model: Model<T>;
    private dbConnection: Promise<Mongoose>;

    constructor(dbConnection: Promise<Mongoose>, name: string, schema: Schema, plural?: string) {
        this.dbConnection = dbConnection;
        this.model = model<T>(name, schema, plural || name);
    }


    save(data: T): Promise<T> {
        return this.dbConnection
            .then(() => {
                return new this.model(data)
                    .save();
            });
    }

    find(mongoQuery: any, outputFields?: object, populateOptions?: ModelPopulateOptions, limit?: number): Promise<T[]> {
        return this.dbConnection
            .then(() => {
                let query = this.model
                    .find(mongoQuery, outputFields);

                if (populateOptions) {
                    query.populate(populateOptions);
                }

                if (limit) {
                    query = query.limit(limit);
                }

                return query.exec();
            });
    }

    findOne(mongoQuery: any, outputFields?: object, populateOptions?: ModelPopulateOptions): Promise<T> {
        return this.find(mongoQuery, outputFields, populateOptions)
            .then((records: T[]) => records[0]);
    }

    findOneAndUpdate(mongoQuery: any, update: any, options?: QueryFindOneAndUpdateOptions): Promise<T> {
        return this.dbConnection
            .then(() => {
                return this.model.findOneAndUpdate(mongoQuery, update, options);
            });
    }

    findOneAndRemove(mongoQuery: any): Promise<T> {
        return this.dbConnection
            .then(() => {
                return this.model.findOneAndRemove(mongoQuery);
            });
    }
}
