import { css } from '@rocket.chat/css-in-js';
import { Field, TextInput, ButtonGroup, Button, Box, Icon, Callout, FieldGroup } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useState, useEffect, useContext } from 'react';

import { validateEmail } from '../../../../../lib/emailValidator';
import UserAutoCompleteMultiple from '../../../../components/UserAutoCompleteMultiple';
import { useEndpoint } from '../../../../contexts/ServerContext';
import { useToastMessageDispatch } from '../../../../contexts/ToastMessagesContext';
import { useTranslation } from '../../../../contexts/TranslationContext';
import { useForm } from '../../../../hooks/useForm';
import { roomCoordinator } from '../../../../lib/rooms/roomCoordinator';
import { SelectedMessageContext, useCountSelected } from '../../MessageList/contexts/SelectedMessagesContext';
import { useUserRoom } from '../../hooks/useUserRoom';

const clickable = css`
	cursor: pointer;
`;

const MailExportForm = ({ onCancel, rid }) => {
	const { selectedMessageStore } = useContext(SelectedMessageContext);

	const t = useTranslation();
	const room = useUserRoom(rid);
	const roomName = room && room.t && roomCoordinator.getRoomName(room.t, room);

	const [selectedMessages, setSelected] = useState([]);
	const [errorMessage, setErrorMessage] = useState();

	const messages = selectedMessageStore ? selectedMessageStore.getSelectedMessages() : selectedMessages;

	const { values, handlers } = useForm({
		dateFrom: '',
		dateTo: '',
		toUsers: [],
		additionalEmails: '',
		subject: t('Mail_Messages_Subject', roomName),
	});

	const dispatchToastMessage = useToastMessageDispatch();

	const { toUsers, additionalEmails, subject } = values;

	const clearSelection = useMutableCallback(() => {
		setSelected([]);
		selectedMessageStore.clearStore();
		$('.messages-box .message', $(`#chat-window-${rid}`)).removeClass('selected');
	});

	useEffect(() => {
		const $root = $(`#chat-window-${rid}`);
		$('.messages-box', $root).addClass('selectable');

		const handler = function () {
			const { id } = this;

			if (this.classList.contains('selected')) {
				this.classList.remove('selected');
				setSelected((selectedMessages) => selectedMessages.filter((message) => message !== id));
			} else {
				this.classList.add('selected');
				setSelected((selectedMessages) => selectedMessages.concat(id));
			}
		};
		$('.messages-box .message', $root).on('click', handler);
		return () => {
			$('.messages-box', $root).removeClass('selectable');
			$('.messages-box .message', $root).off('click', handler).filter('.selected').removeClass('selected');
		};
	}, [rid]);

	useEffect(() => {
		selectedMessageStore.setIsSelecting(true);
		return () => {
			selectedMessageStore.reset();
		};
	}, [selectedMessageStore]);

	const { handleToUsers, handleAdditionalEmails, handleSubject } = handlers;

	const onChangeUsers = useMutableCallback((value, action) => {
		if (!action) {
			if (toUsers.includes(value)) {
				return;
			}
			return handleToUsers([...toUsers, value]);
		}
		handleToUsers(toUsers.filter((current) => current !== value));
	});

	const roomsExport = useEndpoint('POST', 'rooms.export');

	const handleSubmit = async () => {
		if (toUsers.length === 0 && additionalEmails === '') {
			setErrorMessage(t('Mail_Message_Missing_to'));
			return;
		}
		if (additionalEmails !== '' && !validateEmail(additionalEmails)) {
			setErrorMessage(t('Mail_Message_Invalid_emails', additionalEmails));
			return;
		}
		if (messages.length === 0) {
			setErrorMessage(t('Mail_Message_No_messages_selected_select_all'));
			return;
		}
		setErrorMessage(null);

		try {
			await roomsExport({
				rid,
				type: 'email',
				toUsers,
				toEmails: additionalEmails.split(','),
				subject,
				messages,
			});

			dispatchToastMessage({
				type: 'success',
				message: t('Your_email_has_been_queued_for_sending'),
			});
		} catch (error) {
			dispatchToastMessage({
				type: 'error',
				message: error,
			});
		}
	};

	return (
		<FieldGroup>
			<Field>
				<Callout onClick={clearSelection} title={t('Messages selected')} type={useCountSelected() > 0 ? 'success' : 'info'}>
					<p>{`${useCountSelected()} Messages selected`}</p>
					{useCountSelected() > 0 && (
						<Box is='p' className={clickable}>
							{t('Click here to clear the selection')}
						</Box>
					)}
					{useCountSelected() === 0 && <Box is='p'>{t('Click_the_messages_you_would_like_to_send_by_email')}</Box>}
				</Callout>
			</Field>
			<Field>
				<Field.Label>{t('To_users')}</Field.Label>
				<Field.Row>
					<UserAutoCompleteMultiple value={toUsers} onChange={onChangeUsers} />
				</Field.Row>
			</Field>
			<Field>
				<Field.Label>{t('To_additional_emails')}</Field.Label>
				<Field.Row>
					<TextInput
						placeholder={t('Email_Placeholder_any')}
						value={additionalEmails}
						onChange={handleAdditionalEmails}
						addon={<Icon name='mail' size='x20' />}
					/>
				</Field.Row>
			</Field>
			<Field>
				<Field.Label>{t('Subject')}</Field.Label>
				<Field.Row>
					<TextInput value={subject} onChange={handleSubject} addon={<Icon name='edit' size='x20' />} />
				</Field.Row>
			</Field>

			{errorMessage && <Callout type={'danger'} title={errorMessage} />}

			<ButtonGroup stretch mb='x12'>
				<Button onClick={onCancel}>{t('Cancel')}</Button>
				<Button primary onClick={() => handleSubmit()}>
					{t('Send')}
				</Button>
			</ButtonGroup>
		</FieldGroup>
	);
};

export default MailExportForm;
