"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqljsDriver = void 0;
const AbstractSqliteDriver_1 = require("../sqlite-abstract/AbstractSqliteDriver");
const SqljsQueryRunner_1 = require("./SqljsQueryRunner");
const DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
const DriverOptionNotSetError_1 = require("../../error/DriverOptionNotSetError");
const PlatformTools_1 = require("../../platform/PlatformTools");
const OrmUtils_1 = require("../../util/OrmUtils");
const error_1 = require("../../error");
class SqljsDriver extends AbstractSqliteDriver_1.AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        // If autoSave is enabled by user, location or autoSaveCallback have to be set
        // because either autoSave saves to location or calls autoSaveCallback.
        if (this.options.autoSave &&
            !this.options.location &&
            !this.options.autoSaveCallback) {
            throw new DriverOptionNotSetError_1.DriverOptionNotSetError(`location or autoSaveCallback`);
        }
        // load sql.js package
        this.loadDependencies();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    async connect() {
        this.databaseConnection = await this.createDatabaseConnection();
    }
    /**
     * Closes connection with database.
     */
    async disconnect() {
        this.queryRunner = undefined;
        this.databaseConnection.close();
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode) {
        if (!this.queryRunner)
            this.queryRunner = new SqljsQueryRunner_1.SqljsQueryRunner(this);
        return this.queryRunner;
    }
    /**
     * Loads a database from a given file (Node.js), local storage key (browser) or array.
     * This will delete the current database!
     */
    async load(fileNameOrLocalStorageOrData, checkIfFileOrLocalStorageExists = true) {
        if (typeof fileNameOrLocalStorageOrData === "string") {
            // content has to be loaded
            if (PlatformTools_1.PlatformTools.type === "node") {
                // Node.js
                // fileNameOrLocalStorageOrData should be a path to the file
                if (PlatformTools_1.PlatformTools.fileExist(fileNameOrLocalStorageOrData)) {
                    const database = PlatformTools_1.PlatformTools.readFileSync(fileNameOrLocalStorageOrData);
                    return this.createDatabaseConnectionWithImport(database);
                }
                else if (checkIfFileOrLocalStorageExists) {
                    throw new error_1.TypeORMError(`File ${fileNameOrLocalStorageOrData} does not exist`);
                }
                else {
                    // File doesn't exist and checkIfFileOrLocalStorageExists is set to false.
                    // Therefore open a database without importing an existing file.
                    // File will be written on first write operation.
                    return this.createDatabaseConnectionWithImport();
                }
            }
            else {
                // browser
                // fileNameOrLocalStorageOrData should be a local storage / indexedDB key
                let localStorageContent = null;
                if (this.options.useLocalForage) {
                    if (window.localforage) {
                        localStorageContent = await window.localforage.getItem(fileNameOrLocalStorageOrData);
                    }
                    else {
                        throw new error_1.TypeORMError(`localforage is not defined - please import localforage.js into your site`);
                    }
                }
                else {
                    localStorageContent =
                        PlatformTools_1.PlatformTools.getGlobalVariable().localStorage.getItem(fileNameOrLocalStorageOrData);
                }
                if (localStorageContent != null) {
                    // localStorage value exists.
                    return this.createDatabaseConnectionWithImport(JSON.parse(localStorageContent));
                }
                else if (checkIfFileOrLocalStorageExists) {
                    throw new error_1.TypeORMError(`File ${fileNameOrLocalStorageOrData} does not exist`);
                }
                else {
                    // localStorage value doesn't exist and checkIfFileOrLocalStorageExists is set to false.
                    // Therefore open a database without importing anything.
                    // localStorage value will be written on first write operation.
                    return this.createDatabaseConnectionWithImport();
                }
            }
        }
        else {
            return this.createDatabaseConnectionWithImport(fileNameOrLocalStorageOrData);
        }
    }
    /**
     * Saved the current database to the given file (Node.js), local storage key (browser) or
     * indexedDB key (browser with enabled useLocalForage option).
     * If no location path is given, the location path in the options (if specified) will be used.
     */
    async save(location) {
        if (!location && !this.options.location) {
            throw new error_1.TypeORMError(`No location is set, specify a location parameter or add the location option to your configuration`);
        }
        let path = "";
        if (location) {
            path = location;
        }
        else if (this.options.location) {
            path = this.options.location;
        }
        if (PlatformTools_1.PlatformTools.type === "node") {
            try {
                const content = Buffer.from(this.databaseConnection.export());
                await PlatformTools_1.PlatformTools.writeFile(path, content);
            }
            catch (e) {
                throw new error_1.TypeORMError(`Could not save database, error: ${e}`);
            }
        }
        else {
            const database = this.databaseConnection.export();
            // convert Uint8Array to number array to improve local-storage storage
            const databaseArray = [].slice.call(database);
            if (this.options.useLocalForage) {
                if (window.localforage) {
                    await window.localforage.setItem(path, JSON.stringify(databaseArray));
                }
                else {
                    throw new error_1.TypeORMError(`localforage is not defined - please import localforage.js into your site`);
                }
            }
            else {
                PlatformTools_1.PlatformTools.getGlobalVariable().localStorage.setItem(path, JSON.stringify(databaseArray));
            }
        }
    }
    /**
     * This gets called by the QueryRunner when a change to the database is made.
     * If a custom autoSaveCallback is specified, it get's called with the database as Uint8Array,
     * otherwise the save method is called which saves it to file (Node.js), local storage (browser)
     * or indexedDB (browser with enabled useLocalForage option).
     */
    async autoSave() {
        if (this.options.autoSave) {
            if (this.options.autoSaveCallback) {
                await this.options.autoSaveCallback(this.export());
            }
            else {
                await this.save();
            }
        }
    }
    /**
     * Returns the current database as Uint8Array.
     */
    export() {
        return this.databaseConnection.export();
    }
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata, insertResult) {
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            // seems to be the only way to get the inserted id, see https://github.com/kripken/sql.js/issues/77
            if (generatedColumn.isPrimary &&
                generatedColumn.generationStrategy === "increment") {
                const query = "SELECT last_insert_rowid()";
                try {
                    let result = this.databaseConnection.exec(query);
                    this.connection.logger.logQuery(query);
                    return OrmUtils_1.OrmUtils.mergeDeep(map, generatedColumn.createValueMap(result[0].values[0][0]));
                }
                catch (e) {
                    this.connection.logger.logQueryError(e, query, []);
                }
            }
            return map;
        }, {});
        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     * If the location option is set, the database is loaded first.
     */
    createDatabaseConnection() {
        if (this.options.location) {
            return this.load(this.options.location, false);
        }
        return this.createDatabaseConnectionWithImport(this.options.database);
    }
    /**
     * Creates connection with an optional database.
     * If database is specified it is loaded, otherwise a new empty database is created.
     */
    async createDatabaseConnectionWithImport(database) {
        // sql.js < 1.0 exposes an object with a `Database` method.
        const isLegacyVersion = typeof this.sqlite.Database === "function";
        const sqlite = isLegacyVersion
            ? this.sqlite
            : await this.sqlite(this.options.sqlJsConfig);
        if (database && database.length > 0) {
            this.databaseConnection = new sqlite.Database(database);
        }
        else {
            this.databaseConnection = new sqlite.Database();
        }
        this.databaseConnection.exec(`PRAGMA foreign_keys = ON`);
        return this.databaseConnection;
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        if (PlatformTools_1.PlatformTools.type === "browser") {
            const sqlite = this.options.driver || window.SQL;
            this.sqlite = sqlite;
        }
        else {
            try {
                const sqlite = this.options.driver || PlatformTools_1.PlatformTools.load("sql.js");
                this.sqlite = sqlite;
            }
            catch (e) {
                throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("sql.js", "sql.js");
            }
        }
    }
}
exports.SqljsDriver = SqljsDriver;
