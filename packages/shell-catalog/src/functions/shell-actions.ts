import {createFunctionImplementation, type FunctionImplementation} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * The shell's closed action set (SPEC §4.2, §7; task-6.2 decisions 1–3): catalog functions a
 * shell surface's button invokes through `functionCall`, run on the client like the basic
 * catalog's `openUrl`. A function does nothing itself — it hands the action to the host, which
 * decides what opening the Store, the App Library or Publish looks like (task-14.5 decision 8).
 */
export const SHELL_ACTIONS = ['openStore', 'openAppLibrary', 'openPublish'] as const;
export type ShellActionName = (typeof SHELL_ACTIONS)[number];

/**
 * One shell action as the host receives it, with the surface whose button raised it. A
 * component that raises it directly — an offer's More in the Store, Search the Store or an app's
 * name — names itself in `componentId`, the slot the Store is opened from (task-15.8 decision 8),
 * and only it names an `app`, whose view the Store opens on; a `functionCall` runs with no
 * component in scope, so a button's raise carries none.
 */
export type ShellAction =
  | {name: 'openStore'; surfaceId: string; componentId?: string; query?: string; app?: string}
  | {name: 'openAppLibrary'; surfaceId: string; componentId?: string; app?: string}
  | {name: 'openPublish'; surfaceId: string; componentId?: string};

export type ShellActionHandler = (action: ShellAction) => void;

/**
 * The three functions, bound to the host's handler. Adding an account is not one: it is the shell's
 * add-account tile, a `Slot` holding `addAccount` (task-12.13 decision 27). Each names the surface
 * it was raised on; run in a data context that holds no surface — one over a bare data model — it
 * raises nothing (task-16.6 decision 8).
 */
export function shellActionFunctions(onShellAction: ShellActionHandler): FunctionImplementation[] {
  return [
    createFunctionImplementation(
      {name: 'openStore', returnType: 'void', schema: z.object({query: z.string().optional()})},
      ({query}, context) => {
        const surfaceId = context.surface?.id;
        if (surfaceId === undefined) return;
        onShellAction(
          query ? {name: 'openStore', surfaceId, query} : {name: 'openStore', surfaceId},
        );
      },
    ),
    createFunctionImplementation(
      {name: 'openAppLibrary', returnType: 'void', schema: z.object({app: z.string().optional()})},
      ({app}, context) => {
        const surfaceId = context.surface?.id;
        if (surfaceId === undefined) return;
        onShellAction(
          app ? {name: 'openAppLibrary', surfaceId, app} : {name: 'openAppLibrary', surfaceId},
        );
      },
    ),
    createFunctionImplementation(
      {name: 'openPublish', returnType: 'void', schema: z.object({})},
      (_args, context) => {
        const surfaceId = context.surface?.id;
        if (surfaceId === undefined) return;
        onShellAction({name: 'openPublish', surfaceId});
      },
    ),
  ];
}
