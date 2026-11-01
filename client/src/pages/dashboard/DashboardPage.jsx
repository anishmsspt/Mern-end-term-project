                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeChallenge && (
        <SubmissionModal
          challenge={activeChallenge}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmissionCreated={handleSubmissionCreated}
        />
      )}

      {isHost && isCreateChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="lc-card max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Create challenge</h3>
              <button
                onClick={() => setIsCreateChallengeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {createChallengeError && (
              <div className="p-2.5 rounded-md bg-hard/10 border border-hard/30 text-xs text-hard">
                {createChallengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-3 text-sm">
              <div>
                <label className="lc-label">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Winter 2026 30-Day Sprint"
                  value={newChallengeForm.title}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, title: e.target.value })
                  }
                  className="lc-input"
                />
              </div>

              <div>
                <label className="lc-label">Description</label>
                <textarea
                  rows="2"
                  placeholder="Goals, target problem count, rules..."
                  value={newChallengeForm.description}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, description: e.target.value })
                  }
                  className="lc-input resize-none"
                />
              </div>

              <div>
                <label className="lc-label">Join code (optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for a random code"
                  value={newChallengeForm.joinCode}
                  onChange={(e) =>
                    setNewChallengeForm({
                      ...newChallengeForm,
                      joinCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="lc-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lc-label">Start *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.startDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, startDate: e.target.value })
                    }
                    className="lc-input"
                  />
                </div>
                <div>
                  <label className="lc-label">End *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.endDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, endDate: e.target.value })
                    }
                    className="lc-input"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="lc-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={createChallengeLoading} className="lc-btn-primary text-xs">
                  {createChallengeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {createChallengeLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
