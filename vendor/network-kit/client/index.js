// network-kit browser client entry.
export { NetworkRoom, RoomError } from './room.js';
export { shareLink, readShareLink, forgetShareKey, qrSvg, qrMatrix } from './share.js';
export { tabSession } from './tab.js';
export { MEASURE_NOTICE } from './measure.js';
export { adminPass, forgetAdminPass } from './admin-pass.js';
export { readLobbyLink, forgetLobbyLink } from './lobby.js';
export { watchNotices, NoticeBoard, playWarningSound, noticeText, noticeIcon } from './notices.js';
export {
  PROTOCOL, CLOSE, CLOSE_UNRESPONSIVE, CLOSE_TEXT, gameClosedText, NOTICE_TEXT, LOBBY_REFUSED, normalizeCode, isValidCode, CODE_LENGTH, CODE_MIN_LENGTH, CODE_MAX_LENGTH,
} from '../shared/protocol.js';
export { VERSION } from '../version.js';
