/**
 * The launcher's dev roster (task-11.6 decisions 1 to 3): every app the launcher starts from the
 * apps checkout — its id, its folder in the checkout, its tier and its port. A launch runs one tier.
 * The port is fixed here, the number the agent's own `default_port` carries, so the card URL the
 * registry stores stays right across restarts; a new app's author picks it at scaffold time and
 * adds the app here. The platform assigns no port: an app installed from outside the checkout is
 * reached at its own card URL.
 *
 * By the scaffolder's convention an app's folder holds its agent in `agent/` and its catalog package
 * in `<id>-catalog/`, the package named after the folder.
 */
export const DEFAULT_TIER = 'default';

export const ROSTER = [
  {id: 'github', folder: 'github', tier: DEFAULT_TIER, port: 11001},
  {id: 'gmail', folder: 'gmail', tier: DEFAULT_TIER, port: 11002},
  {id: 'calendar', folder: 'calendar', tier: DEFAULT_TIER, port: 11003},
  {id: 'circleci', folder: 'circleci', tier: DEFAULT_TIER, port: 11004},
  {id: 'linear', folder: 'linear', tier: DEFAULT_TIER, port: 11005},
  {id: 'shop-a', folder: 'mocks/shop-a', tier: 'mocks', port: 12001},
  {id: 'shop-b', folder: 'mocks/shop-b', tier: 'mocks', port: 12002},
];
