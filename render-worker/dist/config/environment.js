"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentMode = void 0;
exports.getConfig = getConfig;
var EnvironmentMode;
(function (EnvironmentMode) {
    EnvironmentMode["DEVELOPMENT"] = "development";
    EnvironmentMode["PRODUCTION"] = "production";
})(EnvironmentMode || (exports.EnvironmentMode = EnvironmentMode = {}));
function getConfig() {
    return {
        video: {
            resolution: process.env.VIDEO_RESOLUTION || '1080p'
        }
    };
}
