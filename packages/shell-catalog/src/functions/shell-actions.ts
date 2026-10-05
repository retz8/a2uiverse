import {createFunctionImplementation, type FunctionImplementation} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * The shell's closed action set (SPEC §4.2, §7; task-6.2 decisions 1–3): catalog functions a
 * shell surface's button invokes through `functionCall`, run on the client like the basic
 * catalog's `openUrl`. A function does nothing itself — it hands the action to the host, which
 * decides what opening the Store or the App Library looks like.
 */
export const SHELL_ACTIONS = ['openStore', 'openAppLibrary', 'addAccount'] as const;
export type ShellActionName = (typeof SHELL_ACTIONS)[number];

/**
 * One shell action as the host receives it, with the surface whose button raised it. A
 * component that raises it directly — the capability tile — names itself in `componentId`; a
 * `functionCall` runs with no component in scope, so a button's raise carries none.
 */
export type ShellAction =
  | {name: 'openStore'; surfaceId: string; componentId?: string; query?: string}
  | {name: 'openAppLibrary'; surfaceId: string; componentId?: string}
  | {name: 'addAccount'; surfaceId: string; componentId?: string; app: string};

export type ShellActionHandler = (action: ShellAction) => void;

/**
 * The three functions, bound to the host's handler. `addAccount` names the bare app id — an
 * account is added to an app, the vault numbering it (task-12.2 decision 11).
 */
export function shellActionFunctions(onShellAction: ShellActionHandler): FunctionImplementation[] {
  return [
    createFunctionImplementation(
      {name: 'openStore', returnType: 'void', schema: z.object({query: z.string().optional()})},
      ({query}, context) => {
        const surfaceId = context.surface.id;
        onShellAction(
          query ? {name: 'openStore', surfaceId, query} : {name: 'openStore', surfaceId},
        );
      },
    ),
    createFunctionImplementation(
      {name: 'openAppLibrary', returnType: 'void', schema: z.object({})},
      (_args, context) => {
        onShellAction({name: 'openAppLibrary', surfaceId: context.surface.id});
      },
    ),
    createFunctionImplementation(
      {name: 'addAccount', returnType: 'void', schema: z.object({app: z.string().min(1)})},
      ({app}, context) => {
        onShellAction({name: 'addAccount', surfaceId: context.surface.id, app});
      },
    ),
  ];
}
