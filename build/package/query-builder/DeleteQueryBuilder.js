"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteQueryBuilder = void 0;
const QueryBuilder_1 = require("./QueryBuilder");
const DeleteResult_1 = require("./result/DeleteResult");
const ReturningStatementNotSupportedError_1 = require("../error/ReturningStatementNotSupportedError");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
class DeleteQueryBuilder extends QueryBuilder_1.QueryBuilder {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connectionOrQueryBuilder, queryRunner) {
        super(connectionOrQueryBuilder, queryRunner);
        this["@instanceof"] = Symbol.for("DeleteQueryBuilder");
        this.expressionMap.aliasNamePrefixingEnabled = false;
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Gets generated SQL query without parameters being replaced.
     */
    getQuery() {
        let sql = this.createComment();
        sql += this.createCteExpression();
        sql += this.createDeleteExpression();
        return sql.trim();
    }
    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute() {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            // call before deletion methods in listeners and subscribers
            if (this.expressionMap.callListeners === true &&
                this.expressionMap.mainAlias.hasMetadata) {
                await queryRunner.broadcaster.broadcast("BeforeRemove", this.expressionMap.mainAlias.metadata);
            }
            // execute query
            const queryResult = await queryRunner.query(sql, parameters, true);
            const deleteResult = DeleteResult_1.DeleteResult.from(queryResult);
            // call after deletion methods in listeners and subscribers
            if (this.expressionMap.callListeners === true &&
                this.expressionMap.mainAlias.hasMetadata) {
                await queryRunner.broadcaster.broadcast("AfterRemove", this.expressionMap.mainAlias.metadata);
            }
            // close transaction if we started it
            if (transactionStartedByUs)
                await queryRunner.commitTransaction();
            return deleteResult;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) {
                // means we created our own query runner
                await queryRunner.release();
            }
        }
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    from(entityTarget, aliasName) {
        entityTarget = InstanceChecker_1.InstanceChecker.isEntitySchema(entityTarget)
            ? entityTarget.options.name
            : entityTarget;
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return this;
    }
    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where, parameters) {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.getWhereCondition(where);
        if (condition)
            this.expressionMap.wheres = [
                { type: "simple", condition: condition },
            ];
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where, parameters) {
        this.expressionMap.wheres.push({
            type: "and",
            condition: this.getWhereCondition(where),
        });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where, parameters) {
        this.expressionMap.wheres.push({
            type: "or",
            condition: this.getWhereCondition(where),
        });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Sets WHERE condition in the query builder with a condition for the given ids.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     */
    whereInIds(ids) {
        return this.where(this.getWhereInIdsCondition(ids));
    }
    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    andWhereInIds(ids) {
        return this.andWhere(this.getWhereInIdsCondition(ids));
    }
    /**
     * Adds new OR WHERE with conditions for the given ids.
     */
    orWhereInIds(ids) {
        return this.orWhere(this.getWhereInIdsCondition(ids));
    }
    /**
     * Optional returning/output clause.
     */
    output(output) {
        return this.returning(output);
    }
    /**
     * Optional returning/output clause.
     */
    returning(returning) {
        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported("delete")) {
            throw new ReturningStatementNotSupportedError_1.ReturningStatementNotSupportedError();
        }
        this.expressionMap.returning = returning;
        return this;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates DELETE express used to perform query.
     */
    createDeleteExpression() {
        const tableName = this.getTableName(this.getMainTableName());
        const whereExpression = this.createWhereExpression();
        const returningExpression = this.createReturningExpression("delete");
        if (returningExpression === "") {
            return `DELETE FROM ${tableName}${whereExpression}`;
        }
        if (this.connection.driver.options.type === "mssql") {
            return `DELETE FROM ${tableName} OUTPUT ${returningExpression}${whereExpression}`;
        }
        return `DELETE FROM ${tableName}${whereExpression} RETURNING ${returningExpression}`;
    }
}
exports.DeleteQueryBuilder = DeleteQueryBuilder;
