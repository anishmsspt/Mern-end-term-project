import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getMySubmissions, createChallenge } from '../../services/api';
import JoinChallengeCard from '../../components/challenges/JoinChallengeCard';
import SubmissionModal from '../../components/submissions/SubmissionModal';
import SubmissionsList from '../../components/submissions/SubmissionsList';
import { ExternalLink, PlusCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isHost, isParticipant } = useAuth();

  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [newChallengeForm, setNewChallengeForm] = useState({
    title: '',
    description: '',
    joinCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [createChallengeLoading, setCreateChallengeLoading] = useState(false);
  const [createChallengeError, setCreateChallengeError] = useState(null);

  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const challengeRes = await getMyChallenges(token);
      const userChallenges = challengeRes.challenges || [];
      setChallenges(userChallenges);

      const currentActive = userChallenges.find((c) => c.status === 'active') || userChallenges[0] || null;
      setActiveChallenge(currentActive);

      if (isParticipant) {
        const subRes = await getMySubmissions(currentActive?._id, token);
        setSubmissions(subRes.submissions || []);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const handleChallengeJoined = (newChallenge) => {
    setActiveChallenge(newChallenge);
    loadDashboardData();
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    setCreateChallengeLoading(true);
    setCreateChallengeError(null);
    try {
      const res = await createChallenge(newChallengeForm, token);
      if (res.success) {
        setIsCreateChallengeModalOpen(false);
        setNewChallengeForm({
          title: '',
          description: '',
          joinCode: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        loadDashboardData();
      } else {
        setCreateChallengeError(res.message || 'Failed to create challenge');
      }
    } catch (err) {
      setCreateChallengeError(err.message || 'Error creating challenge');
    } finally {
      setCreateChallengeLoading(false);
    }
  };

  const handleSubmissionCreated = (newSub) => {
    setSubmissions((prev) => [newSub, ...prev]);
  };

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'Pending').length;

  return (
    <div className="lc-page space-y-6">
      <div className="relative isolate overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090b12] px-6 py-8 shadow-2xl shadow-black/30 sm:px-9 sm:py-10">
