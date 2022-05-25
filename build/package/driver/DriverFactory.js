"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverFactory = void 0;
const error_1 = require("../error");
//import { CockroachDriver } from "./cockroachdb/CockroachDriver"
//import { MongoDriver } from "./mongodb/MongoDriver"
//import { SqlServerDriver } from "./sqlserver/SqlServerDriver"
//import { OracleDriver } from "./oracle/OracleDriver"
//import { SqliteDriver } from "./sqlite/SqliteDriver"
//import { CordovaDriver } from "./cordova/CordovaDriver"
//import { ReactNativeDriver } from "./react-native/ReactNativeDriver"
//import { NativescriptDriver } from "./nativescript/NativescriptDriver"
//import { SqljsDriver } from "./sqljs/SqljsDriver"
const MysqlDriver_1 = require("./mysql/MysqlDriver");
const PostgresDriver_1 = require("./postgres/PostgresDriver");
//import { SapDriver } from "./sap/SapDriver"
//import { BetterSqlite3Driver } from "./better-sqlite3/BetterSqlite3Driver"
//import { CapacitorDriver } from "./capacitor/CapacitorDriver"
//import { SpannerDriver } from "./spanner/SpannerDriver"
/**
 * Helps to create drivers.
 */
class DriverFactory {
    /**
     * Creates a new driver depend on a given connection's driver type.
     */
    create(connection) {
        const { type } = connection.options;
        switch (type) {
            case "mysql":
                return new MysqlDriver_1.MysqlDriver(connection);
            case "postgres":
                return new PostgresDriver_1.PostgresDriver(connection);
            // case "cockroachdb":
            //     return new CockroachDriver(connection)
            // case "sap":
            //     return new SapDriver(connection)
            case "mariadb":
                return new MysqlDriver_1.MysqlDriver(connection);
            // case "sqlite":
            //     return new SqliteDriver(connection)
            // case "better-sqlite3":
            //     return new BetterSqlite3Driver(connection)
            // case "cordova":
            //     return new CordovaDriver(connection)
            // case "nativescript":
            //     return new NativescriptDriver(connection)
            // case "react-native":
            //     return new ReactNativeDriver(connection)
            // case "sqljs":
            //     return new SqljsDriver(connection)
            // case "oracle":
            //     return new OracleDriver(connection)
            // case "mssql":
            //     return new SqlServerDriver(connection)
            // case "mongodb":
            //     return new MongoDriver(connection)
            // case "expo":
            //     return new ExpoDriver(connection)
            // case "aurora-mysql":
            //     return new AuroraMysqlDriver(connection)
            // case "aurora-postgres":
            //     return new AuroraPostgresDriver(connection)
            // case "capacitor":
            //     return new CapacitorDriver(connection)
            // case "spanner":
            //     return new SpannerDriver(connection)
            default:
                throw new error_1.MissingDriverError(type, [
                    "aurora-mysql",
                    "aurora-postgres",
                    "better-sqlite3",
                    "capacitor",
                    "cockroachdb",
                    "cordova",
                    "expo",
                    "mariadb",
                    "mongodb",
                    "mssql",
                    "mysql",
                    "nativescript",
                    "oracle",
                    "postgres",
                    "react-native",
                    "sap",
                    "sqlite",
                    "sqljs",
                    "spanner",
                ]);
        }
    }
}
exports.DriverFactory = DriverFactory;
