import { WorkerBroadcastChannel } from './WorkerBroadcastChannel.js';
import {
  type BroadcastChannelResponse,
  type BroadcastChannelResponsePayload,
  type MessageEvent,
  type ResponsePayload,
  ResponseStatus,
} from '../../types/index.js';
import { isNullOrUndefined, logger } from '../../utils/index.js';
import type { AbstractUIService } from '../ui-server/ui-services/AbstractUIService.js';

const moduleName = 'UIServiceWorkerBroadcastChannel';

interface Responses {
  responsesExpected: number;
  responsesReceived: number;
  responses: BroadcastChannelResponsePayload[];
}

export class UIServiceWorkerBroadcastChannel extends WorkerBroadcastChannel {
  private readonly uiService: AbstractUIService;
  private readonly responses: Map<string, Responses>;

  constructor(uiService: AbstractUIService) {
    super();
    this.uiService = uiService;
    this.onmessage = this.responseHandler.bind(this) as (message: unknown) => void;
    this.onmessageerror = this.messageErrorHandler.bind(this) as (message: unknown) => void;
    this.responses = new Map<string, Responses>();
  }

  private responseHandler(messageEvent: MessageEvent): void {
    const validatedMessageEvent = this.validateMessageEvent(messageEvent);
    if (validatedMessageEvent === false) {
      return;
    }
    if (this.isRequest(validatedMessageEvent.data) === true) {
      return;
    }
    const [uuid, responsePayload] = validatedMessageEvent.data as BroadcastChannelResponse;
    if (this.responses.has(uuid) === false) {
      this.responses.set(uuid, {
        responsesExpected: this.uiService.getBroadcastChannelExpectedResponses(uuid),
        responsesReceived: 1,
        responses: [responsePayload],
      });
    } else if (
      this.responses.get(uuid)!.responsesReceived <= this.responses.get(uuid)!.responsesExpected
    ) {
      ++this.responses.get(uuid)!.responsesReceived;
      this.responses.get(uuid)?.responses.push(responsePayload);
    }
    if (
      this.responses.get(uuid)?.responsesReceived === this.responses.get(uuid)?.responsesExpected
    ) {
      this.uiService.sendResponse(uuid, this.buildResponsePayload(uuid));
      this.responses.delete(uuid);
      this.uiService.deleteBroadcastChannelRequest(uuid);
    }
  }

  private buildResponsePayload(uuid: string): ResponsePayload {
    const responsesStatus =
      this.responses
        .get(uuid)
        ?.responses.every(({ status }) => status === ResponseStatus.SUCCESS) === true
        ? ResponseStatus.SUCCESS
        : ResponseStatus.FAILURE;
    return {
      status: responsesStatus,
      hashIdsSucceeded: this.responses
        .get(uuid)
        ?.responses.map(({ status, hashId }) => {
          if (hashId !== undefined && status === ResponseStatus.SUCCESS) {
            return hashId;
          }
        })
        .filter((hashId) => !isNullOrUndefined(hashId)) as string[],
      ...(responsesStatus === ResponseStatus.FAILURE && {
        hashIdsFailed: this.responses
          .get(uuid)
          ?.responses.map(({ status, hashId }) => {
            if (hashId !== undefined && status === ResponseStatus.FAILURE) {
              return hashId;
            }
          })
          .filter((hashId) => !isNullOrUndefined(hashId)) as string[],
      }),
      ...(responsesStatus === ResponseStatus.FAILURE && {
        responsesFailed: this.responses
          .get(uuid)
          ?.responses.map((response) => {
            if (response !== undefined && response.status === ResponseStatus.FAILURE) {
              return response;
            }
          })
          .filter((response) => !isNullOrUndefined(response)) as BroadcastChannelResponsePayload[],
      }),
    };
  }

  private messageErrorHandler(messageEvent: MessageEvent): void {
    logger.error(
      `${this.uiService.logPrefix(moduleName, 'messageErrorHandler')} Error at handling message:`,
      messageEvent,
    );
  }
}
