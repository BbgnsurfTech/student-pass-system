import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Psychology as BrainIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Camera as VisionIcon,
  Recommend as RecommendIcon,
  Shield as FraudIcon,
  Chat as ChatIcon,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Info,
  Send,
  PhotoCamera,
  Upload,
  AutoAwesome,
  Insights
} from '@mui/icons-material';

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'processing' | 'error' | 'success';
  confidence?: number;
  lastUpdated?: Date;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

const AIFeaturesDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [fraudScore, setFraudScore] = useState(0.1);
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 45,
    memoryUsage: 62,
    predictedLoad: 78,
    anomaliesDetected: 3
  });

  const aiFeatures: AIFeature[] = [
    {
      id: 'intelligent-approval',
      title: 'Intelligent Pass Approval',
      description: 'ML-powered automatic pass approval with 94.2% accuracy',
      icon: <AutoAwesome color="primary" />,
      status: 'active',
      confidence: 0.942,
      lastUpdated: new Date()
    },
    {
      id: 'predictive-analytics',
      title: 'Predictive Analytics',
      description: 'Forecast peak periods and capacity needs',
      icon: <TrendingUp color="success" />,
      status: 'active',
      confidence: 0.87,
      lastUpdated: new Date()
    },
    {
      id: 'nlp-chatbot',
      title: 'AI Chatbot',
      description: 'Natural language processing for student support',
      icon: <ChatIcon color="info" />,
      status: 'active',
      confidence: 0.91,
      lastUpdated: new Date()
    },
    {
      id: 'computer-vision',
      title: 'Document Verification',
      description: 'Computer vision for fraud detection and verification',
      icon: <VisionIcon color="warning" />,
      status: 'processing',
      confidence: 0.95,
      lastUpdated: new Date()
    },
    {
      id: 'recommendations',
      title: 'Smart Recommendations',
      description: 'Personalized recommendations for optimal user experience',
      icon: <RecommendIcon color="secondary" />,
      status: 'active',
      confidence: 0.83,
      lastUpdated: new Date()
    },
    {
      id: 'fraud-detection',
      title: 'Fraud Detection',
      description: 'Real-time behavioral analysis and risk assessment',
      icon: <FraudIcon color="error" />,
      status: 'active',
      confidence: 0.978,
      lastUpdated: new Date()
    }
  ];

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(85, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        predictedLoad: Math.max(40, Math.min(95, prev.predictedLoad + (Math.random() - 0.5) * 12)),
        anomaliesDetected: Math.max(0, prev.anomaliesDetected + Math.floor((Math.random() - 0.7) * 3))
      }));

      setFraudScore(prev => Math.max(0, Math.min(1, prev + (Math.random() - 0.5) * 0.1)));
    }, 3000);

    // Load initial recommendations
    loadRecommendations();

    return () => clearInterval(interval);
  }, []);

  const loadRecommendations = () => {
    const mockRecommendations: Recommendation[] = [
      {
        id: '1',
        type: 'pass_type',
        title: 'Consider Semester Pass',
        description: 'Based on your usage pattern, a semester pass would save you 40% on costs.',
        confidence: 0.85,
        priority: 'medium',
        category: 'Cost Optimization'
      },
      {
        id: '2',
        type: 'timing',
        title: 'Optimal Application Time',
        description: 'Apply between 2-4 PM for 50% faster processing.',
        confidence: 0.92,
        priority: 'high',
        category: 'Efficiency'
      },
      {
        id: '3',
        type: 'security',
        title: 'Enable 2FA',
        description: 'Two-factor authentication reduces account risk by 99.9%.',
        confidence: 0.98,
        priority: 'high',
        category: 'Security'
      }
    ];
    setRecommendations(mockRecommendations);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: newMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: generateAIResponse(newMessage),
        timestamp: new Date(),
        intent: 'application_status',
        confidence: 0.91
      };

      setChatMessages(prev => [...prev, botMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage: string): string => {
    const responses = {
      status: "I can help you check your application status. Please provide your application ID or student ID, and I'll look it up for you.",
      apply: "To apply for a new pass, click on 'New Application' in your dashboard. You'll need to upload your student ID and complete the required forms.",
      help: "I'm here to help! I can assist with application status, requirements, processing times, and general questions about the student pass system.",
      default: "Thank you for your question. Let me connect you with the most relevant information based on what you've asked."
    };

    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('status') || lowerMessage.includes('application')) {
      return responses.status;
    } else if (lowerMessage.includes('apply') || lowerMessage.includes('new')) {
      return responses.apply;
    } else if (lowerMessage.includes('help')) {
      return responses.help;
    } else {
      return responses.default;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Real-time System Analytics
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary">CPU Usage</Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemMetrics.cpuUsage} 
                sx={{ mb: 1 }}
                color={systemMetrics.cpuUsage > 80 ? 'error' : 'primary'}
              />
              <Typography variant="caption">{systemMetrics.cpuUsage.toFixed(1)}%</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary">Memory Usage</Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemMetrics.memoryUsage} 
                sx={{ mb: 1 }}
                color={systemMetrics.memoryUsage > 75 ? 'warning' : 'primary'}
              />
              <Typography variant="caption">{systemMetrics.memoryUsage.toFixed(1)}%</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary">Predicted Load (Next Hour)</Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemMetrics.predictedLoad} 
                sx={{ mb: 1 }}
                color={systemMetrics.predictedLoad > 85 ? 'error' : 'success'}
              />
              <Typography variant="caption">{systemMetrics.predictedLoad.toFixed(1)}%</Typography>
            </Box>

            <Alert 
              severity={systemMetrics.anomaliesDetected > 5 ? 'error' : 'info'} 
              sx={{ mb: 2 }}
            >
              {systemMetrics.anomaliesDetected} anomalies detected in the last hour
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Fraud Risk Score
            </Typography>
            
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              <CircularProgress
                variant="determinate"
                value={(1 - fraudScore) * 100}
                size={80}
                color={fraudScore > 0.7 ? 'error' : fraudScore > 0.4 ? 'warning' : 'success'}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" component="div" color="text.secondary">
                  {((1 - fraudScore) * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="textSecondary">
              Current fraud risk: {fraudScore > 0.7 ? 'HIGH' : fraudScore > 0.4 ? 'MEDIUM' : 'LOW'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Features Status
            </Typography>
            <Grid container spacing={2}>
              {aiFeatures.map((feature) => (
                <Grid item xs={12} sm={6} md={4} key={feature.id}>
                  <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {feature.icon}
                      <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                        {feature.title}
                      </Typography>
                      <Chip 
                        label={feature.status} 
                        size="small" 
                        color={getStatusColor(feature.status) as any}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {feature.description}
                    </Typography>
                    {feature.confidence && (
                      <Box>
                        <Typography variant="caption">
                          Accuracy: {(feature.confidence * 100).toFixed(1)}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={feature.confidence * 100} 
                          sx={{ mt: 0.5 }}
                          size="small"
                        />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderChatbot = () => (
    <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          AI Assistant
        </Typography>
        
        <List>
          {chatMessages.map((message) => (
            <ListItem key={message.id} sx={{ 
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              px: 0
            }}>
              <Paper
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  backgroundColor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                  color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography variant="body2">{message.message}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                  {message.timestamp.toLocaleTimeString()}
                  {message.confidence && ` • ${(message.confidence * 100).toFixed(0)}% confidence`}
                </Typography>
              </Paper>
            </ListItem>
          ))}
          
          {isProcessing && (
            <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
              <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" component="span">AI is typing...</Typography>
              </Paper>
            </ListItem>
          )}
        </List>
      </CardContent>
      
      <Divider />
      
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Ask me anything about your pass application..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isProcessing}
          size="small"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={!newMessage.trim() || isProcessing}
          variant="contained"
          endIcon={<Send />}
        >
          Send
        </Button>
      </Box>
    </Card>
  );

  const renderRecommendations = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <RecommendIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Smart Recommendations
        </Typography>
        
        <List>
          {recommendations.map((rec) => (
            <React.Fragment key={rec.id}>
              <ListItem sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                    {(rec.confidence * 100).toFixed(0)}%
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{rec.title}</Typography>
                      <Chip 
                        label={rec.priority} 
                        size="small" 
                        color={getPriorityColor(rec.priority) as any}
                      />
                      <Chip 
                        label={rec.category} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="textSecondary">
                        {rec.description}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={rec.confidence * 100} 
                        sx={{ mt: 1, width: '50%' }}
                        size="small"
                      />
                    </>
                  }
                />
                <Button variant="outlined" size="small">
                  Apply
                </Button>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <AIIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        AI/ML Features Demo
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This demo showcases the cutting-edge AI and machine learning capabilities integrated 
          into the Student Pass System. All data shown is simulated for demonstration purposes.
        </Typography>
      </Alert>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Dashboard" icon={<AnalyticsIcon />} />
          <Tab label="AI Chat" icon={<ChatIcon />} />
          <Tab label="Recommendations" icon={<RecommendIcon />} />
        </Tabs>
      </Box>

      {activeTab === 0 && renderDashboard()}
      {activeTab === 1 && renderChatbot()}
      {activeTab === 2 && renderRecommendations()}
    </Box>
  );
};

export default AIFeaturesDemo;