import { AuthorizationStatus, AuthorizeResponse, StartTransactionResponse, StopTransactionReason, StopTransactionResponse } from '../types/ocpp/1.6/Transaction';
import { PerformanceObserver, performance } from 'perf_hooks';

import ChargingStation from './ChargingStation';
import Constants from '../utils/Constants';
import Utils from '../utils/Utils';
import logger from '../utils/Logger';

export default class AutomaticTransactionGenerator {
  public timeToStop: boolean;
  private chargingStation: ChargingStation;
  private performanceObserver: PerformanceObserver;

  constructor(chargingStation: ChargingStation) {
    this.chargingStation = chargingStation;
    this.timeToStop = true;
    if (this.chargingStation.getEnableStatistics()) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        this.chargingStation.statistics.logPerformance(entry, Constants.ENTITY_AUTOMATIC_TRANSACTION_GENERATOR);
        this.performanceObserver.disconnect();
      });
    }
  }

  _logPrefix(connectorId: number = null): string {
    if (connectorId) {
      return Utils.logPrefix(' ' + this.chargingStation.stationInfo.chargingStationId + ' ATG on connector #' + connectorId.toString() + ':');
    }
    return Utils.logPrefix(' ' + this.chargingStation.stationInfo.chargingStationId + ' ATG:');
  }

  start(): void {
    this.timeToStop = false;
    if (this.chargingStation.stationInfo.AutomaticTransactionGenerator.stopAfterHours &&
      this.chargingStation.stationInfo.AutomaticTransactionGenerator.stopAfterHours > 0) {
      setTimeout(() => {
        void this.stop();
      }, this.chargingStation.stationInfo.AutomaticTransactionGenerator.stopAfterHours * 3600 * 1000);
    }
    for (const connector in this.chargingStation.connectors) {
      if (Utils.convertToInt(connector) > 0) {
        void this.startConnector(Utils.convertToInt(connector));
      }
    }
    logger.info(this._logPrefix() + ' ATG started and will stop in ' + Utils.secondsToHHMMSS(this.chargingStation.stationInfo.AutomaticTransactionGenerator.stopAfterHours * 3600));
  }

  async stop(reason: StopTransactionReason = StopTransactionReason.NONE): Promise<void> {
    logger.info(this._logPrefix() + ' ATG OVER => STOPPING ALL TRANSACTIONS');
    for (const connector in this.chargingStation.connectors) {
      if (this.chargingStation.getConnector(Utils.convertToInt(connector)).transactionStarted) {
        logger.info(this._logPrefix(Utils.convertToInt(connector)) + ' ATG OVER. Stop transaction ' + this.chargingStation.getConnector(Utils.convertToInt(connector)).transactionId.toString());
        await this.chargingStation.sendStopTransaction(this.chargingStation.getConnector(Utils.convertToInt(connector)).transactionId, reason);
      }
    }
    this.timeToStop = true;
  }

  async startConnector(connectorId: number): Promise<void> {
    do {
      if (this.timeToStop) {
        logger.error(this._logPrefix(connectorId) + ' Entered in transaction loop while a request to stop it was made');
        break;
      }
      if (!this.chargingStation._isRegistered()) {
        logger.error(this._logPrefix(connectorId) + ' Entered in transaction loop while the charging station is not registered');
        break;
      }
      if (!this.chargingStation._isChargingStationAvailable()) {
        logger.info(this._logPrefix(connectorId) + ' Entered in transaction loop while the charging station is unavailable');
        await this.stop();
        break;
      }
      if (!this.chargingStation._isConnectorAvailable(connectorId)) {
        logger.info(`${this._logPrefix(connectorId)} Entered in transaction loop while the connector ${connectorId} is unavailable, stop it`);
        break;
      }
      const wait = Utils.getRandomInt(this.chargingStation.stationInfo.AutomaticTransactionGenerator.maxDelayBetweenTwoTransactions,
        this.chargingStation.stationInfo.AutomaticTransactionGenerator.minDelayBetweenTwoTransactions) * 1000;
      logger.info(this._logPrefix(connectorId) + ' wait for ' + Utils.milliSecondsToHHMMSS(wait));
      await Utils.sleep(wait);
      const start = Math.random();
      let skip = 0;
      if (start < this.chargingStation.stationInfo.AutomaticTransactionGenerator.probabilityOfStart) {
        skip = 0;
        // Start transaction
        let startResponse: StartTransactionResponse | AuthorizeResponse;
        if (this.chargingStation.getEnableStatistics()) {
          const startTransaction = performance.timerify(this.startTransaction);
          this.performanceObserver.observe({ entryTypes: ['function'] });
          startResponse = await startTransaction(connectorId, this);
        } else {
          startResponse = await this.startTransaction(connectorId, this);
        }
        if (startResponse?.idTagInfo?.status !== AuthorizationStatus.ACCEPTED) {
          logger.info(this._logPrefix(connectorId) + ' transaction rejected');
          await Utils.sleep(Constants.CHARGING_STATION_ATG_WAIT_TIME);
        } else {
          // Wait until end of transaction
          const waitTrxEnd = Utils.getRandomInt(this.chargingStation.stationInfo.AutomaticTransactionGenerator.maxDuration,
            this.chargingStation.stationInfo.AutomaticTransactionGenerator.minDuration) * 1000;
          logger.info(this._logPrefix(connectorId) + ' transaction ' + this.chargingStation.getConnector(connectorId).transactionId.toString() + ' will stop in ' + Utils.milliSecondsToHHMMSS(waitTrxEnd));
          await Utils.sleep(waitTrxEnd);
          // Stop transaction
          if (this.chargingStation.getConnector(connectorId)?.transactionStarted) {
            logger.info(this._logPrefix(connectorId) + ' stop transaction ' + this.chargingStation.getConnector(connectorId).transactionId.toString());
            if (this.chargingStation.getEnableStatistics()) {
              const stopTransaction = performance.timerify(this.stopTransaction);
              this.performanceObserver.observe({ entryTypes: ['function'] });
              await stopTransaction(connectorId, this);
            } else {
              await this.stopTransaction(connectorId, this);
            }
          }
        }
      } else {
        skip++;
        logger.info(this._logPrefix(connectorId) + ' transaction skipped ' + skip.toString());
      }
    } while (!this.timeToStop);
    logger.info(this._logPrefix(connectorId) + ' ATG STOPPED on the connector');
  }

  // eslint-disable-next-line consistent-this
  private async startTransaction(connectorId: number, self: AutomaticTransactionGenerator): Promise<StartTransactionResponse | AuthorizeResponse> {
    if (self.chargingStation.hasAuthorizedTags()) {
      const tagId = self.chargingStation.getRandomTagId();
      if (self.chargingStation.stationInfo.AutomaticTransactionGenerator.requireAuthorize) {
        // Authorize tagId
        const authorizeResponse = await self.chargingStation.sendAuthorize(tagId);
        if (authorizeResponse?.idTagInfo?.status === AuthorizationStatus.ACCEPTED) {
          logger.info(self._logPrefix(connectorId) + ' start transaction for tagID ' + tagId);
          // Start transaction
          return await self.chargingStation.sendStartTransaction(connectorId, tagId);
        }
        return authorizeResponse;
      }
      logger.info(self._logPrefix(connectorId) + ' start transaction for tagID ' + tagId);
      // Start transaction
      return await self.chargingStation.sendStartTransaction(connectorId, tagId);
    }
    logger.info(self._logPrefix(connectorId) + ' start transaction without a tagID');
    return await self.chargingStation.sendStartTransaction(connectorId);
  }

  // eslint-disable-next-line consistent-this
  private async stopTransaction(connectorId: number, self: AutomaticTransactionGenerator): Promise<StopTransactionResponse> {
    return await self.chargingStation.sendStopTransaction(self.chargingStation.getConnector(connectorId).transactionId);
  }
}
