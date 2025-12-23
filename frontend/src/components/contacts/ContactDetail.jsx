import { X, Mail, Phone, Briefcase, Calendar, Star, Edit3, Save, XCircle, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

const ContactDetail = ({ contact, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState(contact);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setEditedContact(contact);
    setIsEditing(false);
  }, [contact]);

  if (!contact) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const starRating = contact.average_rating ? Math.round((contact.average_rating / 10) * 5) : 0;

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= starRating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-600">
          {contact.average_rating ? contact.average_rating.toFixed(1) : '0.0'}
        </span>
      </div>
    );
  };

  const handleSave = () => {
    onUpdate(contact.contact_id, editedContact);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContact(contact);
    setIsEditing(false);
  };

  const temperatureConfig = {
    HOT: { bg: 'bg-red-500', text: 'text-white', label: 'Hot Lead' },
    WARM: { bg: 'bg-orange-500', text: 'text-white', label: 'Warm Lead' },
    COLD: { bg: 'bg-blue-500', text: 'text-white', label: 'Cold Lead' },
  };

  const statusConfig = {
    LEAD: { bg: 'bg-gray-100', text: 'text-gray-700' },
    MQL: { bg: 'bg-blue-100', text: 'text-blue-700' },
    SQL: { bg: 'bg-purple-100', text: 'text-purple-700' },
    OPPORTUNITY: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    CUSTOMER: { bg: 'bg-green-100', text: 'text-green-700' },
    EVANGELIST: { bg: 'bg-pink-100', text: 'text-pink-700' },
    DORMANT: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  const temp = temperatureConfig[contact.temperature] || temperatureConfig.COLD;
  const status = statusConfig[contact.status] || statusConfig.LEAD;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Contact Details</h2>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 hover:text-green-700"
              >
                <Save className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="relative">
          {/* Background Gradient */}
          <div className={`h-32 ${temp.bg} opacity-90`}></div>
          
          {/* Avatar */}
          <div className="absolute -bottom-12 left-6">
            {!imageError && contact.profile_picture ? (
              <img
                src={contact.profile_picture}
                alt={contact.name}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-lg">
                {getInitials(contact.name)}
              </div>
            )}
          </div>

          {/* Temperature Badge */}
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${temp.bg} ${temp.text}`}>
              {temp.label}
            </span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 px-6 pb-6">
          {isEditing ? (
            <input
              type="text"
              value={editedContact.name}
              onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
              className="text-2xl font-bold text-gray-900 w-full border-b-2 border-sky-500 focus:outline-none bg-transparent"
            />
          ) : (
            <h3 className="text-2xl font-bold text-gray-900">{contact.name}</h3>
          )}
          
          {contact.job_title && (
            <p className="text-gray-500 mt-1">{contact.job_title}</p>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
              {contact.status}
            </span>
          </div>

          {/* Rating */}
          <div className="mt-4">
            {renderStars()}
          </div>
        </div>

        {/* Contact Information */}
        <div className="px-6 pb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Contact Information
          </h4>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedContact.email}
                    onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                    className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent mt-1"
                  />
                ) : (
                  <p className="text-sm text-gray-900 truncate mt-1">{contact.email}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase">Phone</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedContact.phone || ''}
                    onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                    className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent mt-1"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{contact.phone || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Job Title */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase">Job Title</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedContact.job_title || ''}
                    onChange={(e) => setEditedContact({ ...editedContact, job_title: e.target.value })}
                    className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent mt-1"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{contact.job_title || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Created Date */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase">Created</p>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(contact.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Selection (Edit Mode) */}
        {isEditing && (
          <div className="px-6 pb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Lead Temperature
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {['HOT', 'WARM', 'COLD'].map((temp) => {
                const config = temperatureConfig[temp];
                const isSelected = editedContact.temperature === temp;
                return (
                  <button
                    key={temp}
                    onClick={() => setEditedContact({ ...editedContact, temperature: temp })}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isSelected
                        ? `${config.bg} ${config.text} shadow-lg`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {temp}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 p-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {/* TODO: Email */}}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </button>
          <button
            onClick={() => {/* TODO: Call */}}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25"
          >
            <Phone className="w-4 h-4" />
            Call Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;