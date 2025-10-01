import * as React from "react";
import { X, Mail, Calendar, Phone, User, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { applicationsApi } from "@/services/api";

interface ApplicationDetailsDrawerProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ApplicationDetails {
  application: any;
  tasks: any[];
  activities: any[];
  interviews: any[];
  offers: any[];
}

export function ApplicationDetailsDrawer({ applicationId, isOpen, onClose }: ApplicationDetailsDrawerProps) {
  const [details, setDetails] = React.useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (applicationId && isOpen) {
      fetchDetails();
    }
  }, [applicationId, isOpen]);

  const fetchDetails = async () => {
    if (!applicationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await applicationsApi.getDetails(applicationId);
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const app = details?.application;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Application Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-500">Loading details...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-400" />
                  <p className="text-red-500 mb-2">Error loading details</p>
                  <p className="text-slate-500 text-sm">{error}</p>
                </div>
              </div>
            )}

            {details && app && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="offers">Offers</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* Student Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Student Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-500">Name</label>
                          <p className="text-sm">{app.first_name} {app.last_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Email</label>
                          <p className="text-sm">{app.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Phone</label>
                          <p className="text-sm">{app.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Stage</label>
                          <Badge variant="outline">{app.stage}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Application Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Application Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-500">Program</label>
                          <p className="text-sm">{app.programme_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Campus</label>
                          <p className="text-sm">{app.campus_name || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Priority</label>
                          <Badge variant="outline">{app.priority || 'medium'}</Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Urgency</label>
                          <Badge variant="outline">{app.urgency || 'medium'}</Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Lead Score</label>
                          <p className="text-sm">{app.lead_score || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Conversion Probability</label>
                          <p className="text-sm">{app.conversion_probability ? `${Math.round(app.conversion_probability * 100)}%` : 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Mail className="h-4 w-4" />
                          Send Email
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule Meeting
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Phone className="h-4 w-4" />
                          Call Student
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tasks & Blockers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {details.tasks.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="h-8 w-8 mx-auto mb-4 text-slate-300" />
                          <p>No tasks assigned</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {details.tasks.map((task, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-slate-500">{task.description}</p>
                              </div>
                              <Badge variant="outline">{task.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {details.activities.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Clock className="h-8 w-8 mx-auto mb-4 text-slate-300" />
                          <p>No activity recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {details.activities.map((activity, index) => (
                            <div key={index} className="flex gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{activity.activity_title}</p>
                                <p className="text-xs text-slate-500">{activity.activity_description}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(activity.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="offers" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Offers & Interviews</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Interviews */}
                      <div>
                        <h4 className="font-medium mb-3">Interviews</h4>
                        {details.interviews.length === 0 ? (
                          <p className="text-sm text-slate-500">No interviews scheduled</p>
                        ) : (
                          <div className="space-y-3">
                            {details.interviews.map((interview, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {new Date(interview.scheduled_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Status: {interview.outcome || 'Pending'}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {interview.outcome || 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Offers */}
                      <div>
                        <h4 className="font-medium mb-3">Offers</h4>
                        {details.offers.length === 0 ? (
                          <p className="text-sm text-slate-500">No offers made</p>
                        ) : (
                          <div className="space-y-3">
                            {details.offers.map((offer, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                <FileText className="h-4 w-4 text-green-500" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{offer.offer_type}</p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(offer.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant="outline">{offer.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
