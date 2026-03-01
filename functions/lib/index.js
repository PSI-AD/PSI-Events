"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLeadQualified = exports.processReceiptOCR = exports.logisticsNudger = exports.distributeLeads = exports.syncProjects = exports.syncUsers = void 0;
const admin = __importStar(require("firebase-admin"));
const syncUsers_1 = require("./api/syncUsers");
Object.defineProperty(exports, "syncUsers", { enumerable: true, get: function () { return syncUsers_1.syncUsers; } });
const syncProjects_1 = require("./api/syncProjects");
Object.defineProperty(exports, "syncProjects", { enumerable: true, get: function () { return syncProjects_1.syncProjects; } });
const leadDistribution_1 = require("./api/leadDistribution");
Object.defineProperty(exports, "distributeLeads", { enumerable: true, get: function () { return leadDistribution_1.distributeLeads; } });
const logisticsNudger_1 = require("./scheduledJobs/logisticsNudger");
Object.defineProperty(exports, "logisticsNudger", { enumerable: true, get: function () { return logisticsNudger_1.logisticsNudger; } });
const processReceiptOCR_1 = require("./processReceiptOCR");
Object.defineProperty(exports, "processReceiptOCR", { enumerable: true, get: function () { return processReceiptOCR_1.processReceiptOCR; } });
const leadNurture_1 = require("./leadNurture");
Object.defineProperty(exports, "onLeadQualified", { enumerable: true, get: function () { return leadNurture_1.onLeadQualified; } });
/**
 * index.ts
 * Entry point for Firebase Cloud Functions.
 */
admin.initializeApp();
//# sourceMappingURL=index.js.map