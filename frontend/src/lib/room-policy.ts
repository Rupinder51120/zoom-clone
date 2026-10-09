export const defaultPolicy = {
  waiting_room: false,
  locked: false,
  unmute: true,
  video: true,
  chat: true,
  rename: true,
  share: true,
  hide_avatars: false,
};
export type RoomPolicy = typeof defaultPolicy;
export const screenShareHelp =
  "This browser cannot start screen sharing. You can still view another participant’s shared screen. To present, join from a supported desktop browser.";
