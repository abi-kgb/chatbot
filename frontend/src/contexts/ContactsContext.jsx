import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const ContactsContext = createContext();

export const useContacts = () => useContext(ContactsContext);

export const ContactsProvider = ({ user, children }) => {
  const [contactsMap, setContactsMap] = useState({});

  const fetchContacts = async () => {
    if (!user) {
      setContactsMap({});
      return;
    }
    try {
      const res = await api.get('users/contacts/');
      const newMap = {};
      res.data.forEach(c => {
        if (c.contact_user) {
          newMap[c.contact_user.id] = c;
        }
      });
      setContactsMap(newMap);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const addContact = async (contactUserId, savedName) => {
    try {
      const res = await api.post('users/contacts/', {
        contact_user_id: contactUserId,
        saved_name: savedName
      });
      setContactsMap(prev => ({
        ...prev,
        [contactUserId]: res.data
      }));
      return res.data;
    } catch (err) {
      console.error('Failed to add contact', err);
      throw err;
    }
  };

  const updateContact = async (contactId, contactUserId, savedName) => {
    try {
      const res = await api.patch(`users/contacts/${contactId}/`, {
        saved_name: savedName
      });
      setContactsMap(prev => ({
        ...prev,
        [contactUserId]: res.data
      }));
      return res.data;
    } catch (err) {
      console.error('Failed to update contact', err);
      throw err;
    }
  };

  const getDisplayName = (targetUser, fallbackToUsername = false) => {
    if (!targetUser) return '';
    if (targetUser.id === user?.id) return 'You';
    const contact = contactsMap[targetUser.id];
    if (contact) return contact.saved_name;
    if (fallbackToUsername) return targetUser.username || targetUser.phone_number;
    return targetUser.phone_number;
  };

  return (
    <ContactsContext.Provider value={{ contactsMap, fetchContacts, addContact, updateContact, getDisplayName }}>
      {children}
    </ContactsContext.Provider>
  );
};

