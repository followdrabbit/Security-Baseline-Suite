import React, { useState } from 'react';
import { useTeams, useTeamMembers } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/localdb/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Trash2, FolderPlus, Crown, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import HelpButton from '@/components/HelpButton';

const Teams: React.FC = () => {
  const { t } = useI18n();
  const tTeams = (t as any).teamsPage || {};
  const { user } = useAuth();
  const { teams, isLoading, createTeam, addMember, removeMember, assignProjectToTeam } = useTeams();
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const { data: members = [] } = useTeamMembers(selectedTeam);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await localDb.from('projects').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeam.mutateAsync(newTeamName.trim());
      setNewTeamName('');
      toast({
        title: tTeams.createdTitle || 'Team created',
        description: `${tTeams.createdDescPrefix || 'Team'} "${newTeamName}" ${tTeams.createdDescSuffix || 'created successfully.'}`,
      });
    } catch {
      toast({
        title: t.common.error,
        description: tTeams.createFailed || 'Failed to create team.',
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !newMemberEmail.trim()) return;
    // In a real app, you'd look up user by email. For now, we show a message.
    toast({
      title: tTeams.inviteSentTitle || 'Invite sent',
      description: `${tTeams.inviteSentDescPrefix || 'Team invite functionality requires user lookup. Member email:'} ${newMemberEmail}`,
    });
    setNewMemberEmail('');
  };

  const handleAssignProject = async (projectId: string, teamId: string) => {
    try {
      await assignProjectToTeam.mutateAsync({
        projectId,
        teamId: teamId === 'none' ? null : teamId,
      });
      toast({
        title: tTeams.projectUpdatedTitle || 'Project updated',
        description: tTeams.projectUpdatedDesc || 'Project team assignment updated.',
      });
    } catch {
      toast({
        title: t.common.error,
        description: tTeams.assignFailed || 'Failed to assign project.',
        variant: 'destructive',
      });
    }
  };

  const activeTeam = teams.find(t => t.id === selectedTeam);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{tTeams.title || 'Teams'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tTeams.subtitle || 'Manage your teams and collaborate on security baselines'}</p>
        </div>
        <HelpButton section="teams" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create & Select Team */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> {tTeams.createTeam || 'Create Team'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder={tTeams.teamNamePlaceholder || 'Team name...'}
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                />
                <Button size="sm" onClick={handleCreateTeam} disabled={createTeam.isPending}>
                  {tTeams.createButton || 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> {tTeams.yourTeams || 'Your Teams'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">{t.common.loading}</p>
              ) : teams.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tTeams.noTeams || 'No teams yet. Create one above.'}</p>
              ) : (
                <div className="space-y-1">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedTeam === team.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{team.name}</span>
                        {team.owner_id === user?.id && (
                          <Crown className="h-3 w-3 text-primary shrink-0 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2 space-y-4">
          {activeTeam ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{activeTeam.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {activeTeam.owner_id === user?.id
                      ? (tTeams.youAreOwner || 'You are the owner')
                      : (tTeams.memberRole || 'Member')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      {(tTeams.members || 'Members')} ({members.length})
                    </h4>
                    <div className="space-y-1">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-accent/30">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{m.user_id === user?.id ? (tTeams.you || 'You') : m.user_id.slice(0, 8) + '...'}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                          </div>
                          {activeTeam.owner_id === user?.id && m.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeMember.mutate(m.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeTeam.owner_id === user?.id && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{tTeams.addMember || 'Add Member'}</h4>
                      <div className="flex gap-2">
                        <Input
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder={tTeams.memberEmailPlaceholder || 'Member email...'}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={handleAddMember}>
                          {tTeams.addButton || 'Add'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderPlus className="h-4 w-4" /> {tTeams.assignProjects || 'Assign Projects'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tTeams.assignProjectsDesc || 'Share projects with this team for collaborative review'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{tTeams.noProjectsAvailable || 'No projects available.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {projects.map((project: any) => (
                        <div key={project.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-accent/20">
                          <span className="text-sm truncate">{project.name}</span>
                          <Select
                            value={project.team_id || 'none'}
                            onValueChange={(v) => handleAssignProject(project.id, v)}
                          >
                            <SelectTrigger className="w-36 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{tTeams.noTeam || 'No team'}</SelectItem>
                              {teams.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{tTeams.selectTeamToView || 'Select a team to view details'}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Teams;


