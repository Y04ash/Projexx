
import React, { useState, useEffect } from 'react';
import { Users, Plus, Server, AlertCircle } from 'lucide-react';

const TeamCreator = ({ userServers, onTeamCreated, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxMembers: 4,
    studentEmails: [],
    serverCode: ''  // <- server code input
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [emailInput, setEmailInput] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const handleAddEmail = () => {
    if (emailInput.trim() && !formData.studentEmails.includes(emailInput.trim())) {
      setFormData({
        ...formData,
        studentEmails: [...formData.studentEmails, emailInput.trim()]
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      studentEmails: formData.studentEmails.filter(e => e !== email)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.serverCode.trim()) {
      setError('Team name and server code are required');
      return;
    }

    if (formData.studentEmails.length === 0) {
      setError('At least one member email must be added');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/teams/createTeam`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          maxMembers: formData.maxMembers,
          projectServer: formData.serverCode.trim(),
          studentEmails: formData.studentEmails
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onTeamCreated?.(data.team);
        onClose?.();
      } else {
        setError(data.message || 'Failed to create team');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="h-6 w-6 text-blue-600 mr-2" />
          Create New Team
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mr-2 inline" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Server Code Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Project Server Code *
            </label>
            <input
              type="text"
              value={formData.serverCode}
              onChange={(e) => setFormData({ ...formData, serverCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the server code provided by your teacher"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask your teacher for the server code to join their project
            </p>
          </div>

          {/* Team Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Team Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter team name"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Optional team description"
              rows="3"
              disabled={loading}
            />
          </div>

          {/* Max Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Maximum Members
            </label>
            <select
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              disabled={loading}
            >
              {[2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n} members</option>
              ))}
            </select>
          </div>

          {/* Emails of Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Member Emails *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              You will be automatically added as a team member. Add other members below.
            </p>
            <div className="flex mb-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter student email"
                className="flex-1 px-3 py-2 border rounded-l-md"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="bg-blue-600 text-white px-3 py-2 rounded-r-md"
                disabled={loading}
              >
                Add
              </button>
            </div>

            {/* Display added emails */}
            <div className="space-y-1">
              {formData.studentEmails.map(email => (
                <div key={email} className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded-md text-sm">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { TeamCreator };
