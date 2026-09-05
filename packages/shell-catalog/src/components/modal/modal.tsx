import {useContext, type CSSProperties, type ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ModalApi} from '@a2ui/web_core/v0_9';
import {Cross1Icon} from '@radix-ui/react-icons';
import {Dialog, Flex, IconButton, VisuallyHidden} from '@radix-ui/themes';
import {PortalRootContext} from '../../provider.js';
import {weightStyle} from '../shared/layout.js';

/**
 * `Modal` on Radix `Dialog`. The trigger is whatever component the tree names, wrapped in the
 * element Radix's trigger slot needs (a click anywhere inside opens the dialog, so a `Button`
 * trigger still fires its own action too, as upstream's did). The dialog mounts into the
 * bundle's portal root so it stays inside the fragment boundary and under the scoped sheet
 * (SPEC §9.2), and carries a hidden title because the schema has none to show.
 */
export function ModalView({
  trigger,
  content,
  style,
}: {
  trigger: ReactNode;
  content: ReactNode;
  style?: CSSProperties;
}) {
  const portalRoot = useContext(PortalRootContext);
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <div data-modal-trigger="" style={{display: 'inline-block', ...style}}>
          {trigger}
        </div>
      </Dialog.Trigger>
      <Dialog.Content
        container={portalRoot ?? undefined}
        aria-describedby={undefined}
        maxWidth="90vw"
        maxHeight="90vh"
      >
        <VisuallyHidden>
          <Dialog.Title>Dialog</Dialog.Title>
        </VisuallyHidden>
        <Flex justify="end" mb="2">
          <Dialog.Close>
            <IconButton size="1" variant="ghost" color="gray" aria-label="Close">
              <Cross1Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>
        {content}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** Catalog entry: `trigger` and `content` are component ids the renderer builds. */
export const ModalComponent = createComponentImplementation(ModalApi, ({props, buildChild}) => (
  <ModalView
    trigger={props.trigger ? buildChild(props.trigger) : null}
    content={props.content ? buildChild(props.content) : null}
    style={weightStyle(props.weight)}
  />
));
