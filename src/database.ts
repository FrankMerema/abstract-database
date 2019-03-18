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
import { from, Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export class Database {

    private readonly mongoose: Observable<Mongoose>;

    constructor(host: string, port: number, database: string, options?: ConnectionOptions) {
        this.mongoose = from(connect(`mongodb://${host}:${port}/${database}`, options));
        this.mongoose.subscribe(() => {
            console.log('Connected to MongoDB');
        }, error => {
            console.log(error);
            throwError(error);
        });
    }

    getConnection(): Observable<Mongoose> {
        return this.mongoose;
    }
}

export class MongoAtlasDatabase {

    private readonly mongoose: Observable<Mongoose>;

    constructor(username: string, password: string, host: string, database: string, options?: ConnectionOptions) {
        this.mongoose = from(connect(
            `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${database}?retryWrites=true`, options));
        this.mongoose.subscribe(() => {
            console.log('Connected to MongoDB');
        }, error => {
            console.log(error);
            throw error;
        });
    }

    getConnection(): Observable<Mongoose> {
        return this.mongoose;
    }
}


export class Collection<T extends Document> {
    private model: Model<T>;
    private dbConnection: Observable<Mongoose>;

    constructor(dbConnection: Observable<Mongoose>, name: string, schema: Schema, plural?: string) {
        this.dbConnection = dbConnection;
        this.model = model<T>(name, schema, plural || name);
    }


    save(data: T): Observable<T> {
        return this.dbConnection
            .pipe(switchMap(() =>
                from(new this.model(data).save())));
    }

    find(mongoQuery: any, outputFields?: object, populateOptions?: ModelPopulateOptions, limit?: number): Observable<T[]> {
        return this.dbConnection
            .pipe(switchMap(() => {
                let query = this.model
                    .find(mongoQuery, outputFields);

                if (populateOptions) {
                    query.populate(populateOptions);
                }

                if (limit) {
                    query = query.limit(limit);
                }

                return from(query.exec());
            }));
    }

    findOne(mongoQuery: any, outputFields?: object, populateOptions?: ModelPopulateOptions): Observable<T> {
        return this.find(mongoQuery, outputFields, populateOptions)
            .pipe(map((records: T[]) => records[0]));
    }

    findOneAndUpdate(mongoQuery: any, update: any, options?: QueryFindOneAndUpdateOptions): Observable<T> {
        return this.dbConnection
            .pipe(switchMap(() =>
                from(this.model.findOneAndUpdate(mongoQuery, update, options))));
    }

    findOneAndRemove(mongoQuery: any): Observable<T> {
        return this.dbConnection
            .pipe(switchMap(() =>
                from(this.model.findByIdAndRemove(mongoQuery))));
    }

    aggregate(mongoQuery: any, outputFields?: object, limit?: number): Observable<T[]> {
        return this.dbConnection
            .pipe(map(() => {
                const aggregateParams: object[] = [{'$match': mongoQuery}];

                if (outputFields) {
                    aggregateParams.push({'$project': outputFields});
                }

                let request = this.model
                    .aggregate(aggregateParams);

                if (limit) {
                    request = request.limit(limit);
                }

                return request.exec();
            }));
    }

    aggregateOne(mongoQuery: any, outputFields?: object): Observable<T> {
        return this.aggregate(mongoQuery, outputFields)
            .pipe(map((records: T[]) => records[0]));
    }
}
