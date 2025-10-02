import React, { useState, useEffect } from 'react';
import { Camera, Users, BookOpen, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import io from 'socket.io-client';

const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

export default function WhatsAppNameMemorizer() {
  const [step, setStep] = useState('connect'); // connect, groups, study
  const [qrCode, setQrCode] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [groups, setGroups] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    socket.on('qr', (qr) => {
      setQrCode(qr);
      setIsReady(false);
    });

    socket.on('ready', () => {
      setIsReady(true);
      setQrCode(null);
    });

    socket.on('authenticated', () => {
      setQrCode(null);
    });

    socket.on('disconnected', () => {
      setIsReady(false);
      setStep('connect');
    });

    return () => {
      socket.off('qr');
      socket.off('ready');
      socket.off('authenticated');
      socket.off('disconnected');
    };
  }, []);

  const initializeWhatsApp = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/initialize`, { method: 'POST' });
    } catch (error) {
      console.error('Error initializing:', error);
    }
    setLoading(false);
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/groups`);
      const data = await response.json();
      setGroups(data);
      setStep('groups');
    } catch (error) {
      console.error('Error loading groups:', error);
      alert('Error loading groups');
    }
    setLoading(false);
  };

  const selectGroup = async (groupId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/group/${groupId}/participants`);
      const data = await response.json();
      setParticipants(data.filter(p => p.profilePicUrl)); // Only include people with photos
      setCurrentCard(0);
      setShowAnswer(false);
      setStep('study');
    } catch (error) {
      console.error('Error loading participants:', error);
      alert('Error loading participants');
    }
    setLoading(false);
  };

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentCard((prev) => (prev + 1) % participants.length);
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentCard((prev) => (prev - 1 + participants.length) % participants.length);
  };

  const resetDeck = () => {
    setCurrentCard(0);
    setShowAnswer(false);
  };

  // Connect Step
  if (step === 'connect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Name Memorizer</h1>
            <p className="text-gray-600">Connect to WhatsApp to get started</p>
          </div>

          {!isReady && !qrCode && (
            <button
              onClick={initializeWhatsApp}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect to WhatsApp'}
            </button>
          )}

          {qrCode && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Scan this QR code with WhatsApp</p>
              <img src={qrCode} alt="QR Code" className="mx-auto border-4 border-gray-200 rounded-lg" />
              <p className="text-xs text-gray-500 mt-4">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
            </div>
          )}

          {isReady && (
            <div className="text-center">
              <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
                ✓ Connected successfully!
              </div>
              <button
                onClick={loadGroups}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'View My Groups'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Groups Step
  if (step === 'groups') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep('connect')}
              className="text-gray-600 hover:text-gray-800 mb-4 flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Select a Group</h2>

            {groups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No groups found</p>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => selectGroup(group.id)}
                    disabled={loading}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.participantCount} members</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Study Step
  if (step === 'study' && participants.length > 0) {
    const current = participants[currentCard];

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setStep('groups')}
                className="text-gray-600 hover:text-gray-800 flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                onClick={resetDeck}
                className="text-gray-600 hover:text-gray-800 flex items-center"
                title="Reset deck"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <BookOpen className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Card {currentCard + 1} of {participants.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${((currentCard + 1) / participants.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="mb-6">
              <div 
                className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden cursor-pointer"
                style={{ paddingBottom: '100%' }}
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {current.profilePicUrl ? (
                  <img
                    src={current.profilePicUrl}
                    alt="Profile"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="mt-6 text-center min-h-[80px] flex items-center justify-center">
                {showAnswer ? (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{current.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{current.number}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Click the photo or "Show Answer" to reveal the name</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Show Answer
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={prevCard}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={nextCard}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}