import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, Plus, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Link {
  id: string;
  title: string;
  url: string;
  clicks: number;
  status: "active" | "inactive";
  createdAt: Date;
}

const Links = () => {
  const [links, setLinks] = useState<Link[]>([
    {
      id: "1",
      title: "Documentation",
      url: "https://docs.example.com",
      clicks: 1234,
      status: "active",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      title: "API Reference",
      url: "https://api.example.com",
      clicks: 856,
      status: "active",
      createdAt: new Date("2024-02-01"),
    },
    {
      id: "3",
      title: "Support Portal",
      url: "https://support.example.com",
      clicks: 432,
      status: "inactive",
      createdAt: new Date("2024-03-10"),
    },
  ]);

  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) {
      toast.error("Please fill in all fields");
      return;
    }

    const link: Link = {
      id: Date.now().toString(),
      title: newLink.title,
      url: newLink.url,
      clicks: 0,
      status: "active",
      createdAt: new Date(),
    };

    setLinks([link, ...links]);
    setNewLink({ title: "", url: "" });
    setIsDialogOpen(false);
    toast.success("Link created successfully!");
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id));
    toast.success("Link deleted successfully!");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Links</h1>
            <p className="text-muted-foreground">Manage your shortened links and track analytics</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Link</DialogTitle>
                <DialogDescription>
                  Add a new shortened link to track clicks and engagement
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="My Awesome Link"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Destination URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleAddLink}>
                  Create Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Links
              </CardTitle>
              <LinkIcon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{links.length}</div>
              <p className="text-xs text-muted-foreground">
                {links.filter((l) => l.status === "active").length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clicks
              </CardTitle>
              <ExternalLink className="w-4 h-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {links.reduce((acc, link) => acc + link.clicks, 0)}
              </div>
              <p className="text-xs text-success">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Clicks/Link
              </CardTitle>
              <LinkIcon className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(links.reduce((acc, link) => acc + link.clicks, 0) / links.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per link
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Links</CardTitle>
            <CardDescription>All your shortened links in one place</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{link.title}</h3>
                      <Badge variant={link.status === "active" ? "default" : "secondary"}>
                        {link.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{link.url}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{link.clicks} clicks</span>
                      <span>Created {link.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyLink(link.url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(link.url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Links;
