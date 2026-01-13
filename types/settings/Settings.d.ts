type SettingsEvent<T> = {
  oldSettings: T;
  newSettings: T;
  changedKeys: (keyof T)[];
};
