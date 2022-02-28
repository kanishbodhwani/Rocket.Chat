import { MessageDivider } from '@rocket.chat/fuselage';
import React, { FC, Fragment, memo } from 'react';

import { MessageTypes } from '../../../../app/ui-utils/client';
import { isThreadMessage } from '../../../../definition/IMessage';
import { IRoom } from '../../../../definition/IRoom';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUserSubscription } from '../../../contexts/UserContext';
import { useFormatDate } from '../../../hooks/useFormatDate';
import { MessageProvider } from '../providers/MessageProvider';
import Message from './components/Message';
import MessageSystem from './components/MessageSystem';
import { ThreadMessage } from './components/ThreadMessage';
import { useMessages } from './hooks/useMessages';
import { isMessageFirstUnread } from './lib/isMessageFirstUnread';
import { isMessageNewDay } from './lib/isMessageNewDay';
import { isMessageSequential } from './lib/isMessageSequential';
import { MessageListProvider } from './providers/MessageListProvider';

export const MessageList: FC<{ rid: IRoom['_id'] }> = ({ rid }) => {
	const t = useTranslation();
	const messages = useMessages({ rid });
	const subscription = useUserSubscription(rid);
	const format = useFormatDate();
	return (
		<MessageListProvider rid={rid}>
			<MessageProvider rid={rid}>
				{messages.map((message, index, arr) => {
					const previous = arr[index - 1];

					const isNewDay = isMessageNewDay(message, previous);
					const isSequential = isMessageSequential(message, previous);
					const isFirstUnread = isMessageFirstUnread(subscription, message, previous);

					const shouldShowDivider = isNewDay || isFirstUnread;

					const shouldShowAsSequential = isSequential && !isNewDay;

					return (
						<Fragment key={message._id}>
							{shouldShowDivider && (
								<MessageDivider unreadLabel={isFirstUnread ? t('Unread_Messages').toLowerCase() : undefined}>
									{isNewDay && format(message.ts)}
								</MessageDivider>
							)}

							{!MessageTypes.isSystemMessage(message) &&
								(isThreadMessage(message) ? (
									<ThreadMessage
										data-system-message={Boolean(message.t)}
										data-mid={message._id}
										data-unread={isFirstUnread}
										data-sequential={isSequential}
										sequential={shouldShowAsSequential}
										message={message}
									/>
								) : (
									<Message
										data-system-message={Boolean(message.t)}
										data-mid={message._id}
										data-unread={isFirstUnread}
										data-sequential={isSequential}
										sequential={shouldShowAsSequential}
										message={message}
										subscription={subscription}
									/>
								))}

							{MessageTypes.isSystemMessage(message) && <MessageSystem message={message} />}
						</Fragment>
					);
				})}
			</MessageProvider>
		</MessageListProvider>
	);
};

export default memo(MessageList);
