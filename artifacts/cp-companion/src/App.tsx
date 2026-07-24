import { useState } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from './hooks/use-auth';
import Shell from './components/layout/Shell';
import SearchModal from './components/search/SearchModal';

import Login from './pages/Login';
import Overview from './pages/Overview';
import Problems from './pages/Problems';
import Collaborator from './pages/Collaborator';
import Contest from './pages/Contest';
import Revision from './pages/Revision';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

function AppInner() {
  const { user, loading } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Shell onSearchOpen={() => setSearchOpen(true)}>
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/problems" component={Problems} />
          <Route path="/collaborator" component={Collaborator} />
          <Route path="/contest" component={Contest} />
          <Route path="/revision" component={Revision} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route>
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-4xl font-bold">404</p>
                <p className="mt-2 text-sm">Page not found</p>
              </div>
            </div>
          </Route>
        </Switch>
      </Shell>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}