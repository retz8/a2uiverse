import type {Ref} from 'react';
import {Button, Flex, Spinner, Text} from '@radix-ui/themes';

export const WAITING_WORDS = 'Waiting for you to finish signing in';
export const OPEN_AGAIN_WORDS = 'Open the sign-in again';

/**
 * The full waiting form, drawn wherever a sign-in window was opened from a press — the authority
 * tile and an add-account button (task-12.13 decision 26): finishing in the window that opened,
 * the spinner line, and under it Open the sign-in again and Cancel. It stays until the sign-in
 * ends, Cancel or the attempt expires; the window may be a tab hiding the canvas.
 */
export function SignInWaiting({
  app,
  onAgain,
  onCancel,
  cancelRef,
}: {
  /** The app's name; without one, the statement names none. */
  app?: string;
  onAgain?: () => void;
  onCancel?: (button: HTMLElement) => void;
  /** The Cancel button, for a host handing it the focus. */
  cancelRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <Flex direction="column" align="start" gap="4" data-authority="waiting">
      <Text as="p" size="2">
        {app
          ? `Finish signing in to ${app} in the window that opened.`
          : 'Finish in the window that opened.'}
      </Text>
      <Flex direction="column" align="start" gap="3">
        <Flex align="center" gap="2">
          <Spinner size="1" />
          <Text as="span" size="1" color="gray">
            {WAITING_WORDS}
          </Text>
        </Flex>
        {(onAgain || onCancel) && (
          <Flex align="center" gap="2" wrap="wrap">
            {onAgain && (
              <Button size="1" variant="outline" color="gray" onClick={() => onAgain()}>
                {OPEN_AGAIN_WORDS}
              </Button>
            )}
            {onCancel && (
              <Button
                size="1"
                variant="outline"
                color="gray"
                ref={cancelRef}
                onClick={event => onCancel(event.currentTarget)}
              >
                Cancel
              </Button>
            )}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
