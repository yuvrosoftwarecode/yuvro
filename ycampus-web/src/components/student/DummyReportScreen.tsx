import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Calendar,
  Copy,
  Download,
  RotateCcw,
  Bot,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Briefcase,
  Zap,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DummyReportScreenProps {
  onTryAgain?: () => void;
  onBackToLibrary?: () => void;
}

// ── Dummy Data ──────────────────────────────────────────────────────────────

const DUMMY_REPORT = {
  overall_score: 88,
  feedback_summary: "Exceptional performance in theoretical Machine Learning concepts. Your understanding of model evaluation, neural network architectures, and deployment strategies is solid. Your communication was clear and structured, making complex topics easy to follow.",
  performance_metrics: {
    'Supervised Learning': 92,
    'Unsupervised Learning': 85,
    'Model Evaluation': 89,
    'Feature Engineering': 82,
    'Communication': 90,
  },
  skill_analysis: {
    'Linear Models': { score: 9, feedback: 'Strong grasp of gradient descent and cost functions.' },
    'Ensemble Methods': { score: 8, feedback: 'Understands bagging/boosting well.' },
    'Dimensionality Reduction': { score: 7, feedback: 'Good, but could improve on ICA vs PCA nuances.' },
    'Communication': { score: 9, feedback: 'Articulates technical trade-offs with high clarity.' },
  },
  question_analysis: [
    {
      question: 'Explain the difference between L1 and L2 regularization.',
      type: 'Technical',
      score: 92,
      user_answer: 'L1 regularization, also known as Lasso, adds the absolute value of the magnitude of coefficients as a penalty term to the loss function. This diamond-shaped constraint space often forces less important coefficients to exactly zero, which naturally performs feature selection in high-dimensional datasets. On the other hand, L2 regularization, or Ridge, adds the squared magnitude of coefficients. This shrinks weights towards zero but rarely makes them exactly zero, making it more robust when many features contribute small amounts to the prediction.',
      what_went_well: ['Correct mathematical distinction', 'Correct mention of feature selection'],
      what_could_be_better: ['Could explain geometric interpretation of the constraints'],
      recommended_response: 'L1 adds lambda*|w| (Sparsity), L2 adds lambda*w^2 (Shrinkage).',
    },
    {
      question: 'What is the Bias-Variance tradeoff?',
      type: 'Technical',
      score: 95,
      user_answer: 'The bias-variance tradeoff is a fundamental property of machine learning models. Bias represents the error from erroneous assumptions in the learning algorithm, often leading to underfitting. Variance is the error from sensitivity to small fluctuations in the training set, leading to overfitting. We typically use the formula that total error equals bias-squared plus variance plus irreducible error. As we increase model complexity, bias decreases but variance increases. The goal is to find the sweet spot that minimizes the total error for better generalization.',
      what_went_well: ['Clear definition', 'Accuracy of concepts', 'Mentioned the error decomposition formula'],
      what_could_be_better: ['Explain how cross-validation helps manage this tradeoff'],
      recommended_response: 'Balance model complexity to minimize the sum of squared bias and variance.',
    },
    {
      question: 'How do you handle imbalanced datasets?',
      type: 'Technical',
      score: 88,
      user_answer: 'Handling imbalanced data requires moving beyond simple accuracy metrics. From a data perspective, we can use oversampling techniques like SMOTE—which generates synthetic examples by interpolating between existing minority samples—or random undersampling of the majority class. From an algorithmic perspective, we can employ cost-sensitive learning to penalize misclassifications of the minority class more heavily. Finally, we must evaluate using Precision-Recall curves or F1-scores.',
      what_went_well: ['Correct sampling techniques', 'Better metrics mentioned', 'Mentioned SMOTE'],
      what_could_be_better: ['Mention threshold adjustment strategies'],
      recommended_response: 'SMOTE, Undersampling, Cost-sensitive learning, and F1/Precision-Recall metrics.',
    },
    {
      question: 'Describe how a Convolutional Neural Network (CNN) works.',
      type: 'Technical',
      score: 85,
      user_answer: 'CNNs use convolutional layers where filters slide across the input to detect specific patterns like edges or textures. These feature maps are then passed through pooling layers, which reduce the spatial resolution to make the model invariant to small translations. This structure of hierarchical feature extraction allows the model to learn complex shapes from basic lines. By using weight sharing, CNNs significantly reduce the parameter count compared to fully connected networks.',
      what_went_well: ['Good overview of architecture', 'Mentioned spatial invariance'],
      what_could_be_better: ['Elaborate on different types of pooling (Max vs Average)'],
      recommended_response: 'CNNs apply filters to detect spatial hierarchies of features using local connectivity.',
    },
    {
      question: 'Explain transfer learning and its primary benefits.',
      type: 'Technical',
      score: 93,
      user_answer: 'Transfer learning is leveraging a model pre-trained on a massive, general dataset and applying it to a smaller, more specific task. For example, using a ResNet model trained on ImageNet for medical X-ray detection. We usually freeze the early layers, which detect basic features like edges, and only retrain the final layers. This is a game-changer because it allows high performance even with limited data and drastically reduces training time.',
      what_went_well: ['Accurate definition', 'Key benefits listed', 'Correct use of freezing/fine-tuning concepts'],
      what_could_be_better: ['None, very well handled'],
      recommended_response: 'Transfer learning leverages knowledge from large datasets to solve specific tasks efficiently.',
    },
    {
      question: 'How do you evaluate clustering performance without labels?',
      type: 'Technical',
      score: 89,
      user_answer: 'Since clustering is unsupervised, we use internal validity metrics. The Silhouette Coefficient measures how similar a point is to its own cluster versus the nearest neighboring cluster, ranging from -1 to 1. We also look at the Within-Cluster Sum of Squares and use the Elbow Method—plotting WCSS against the number of clusters to find the point where the rate of improvement sharply decreases.',
      what_went_well: ['Correct metrics mentioned', 'Detailed Elbow method explanation'],
      what_could_be_better: ['Explain Silhouette score logic (a-b)/max(a,b)'],
      recommended_response: 'Silhouette score and Elbow method are standard for internal validation.',
    },
    {
      question: 'What is the adversarial process in GANs?',
      type: 'Technical',
      score: 91,
      user_answer: 'Generative Adversarial Networks consist of two neural networks, a Generator and a Discriminator, that compete in a minimax game. The Generator tries to produce realistic fake samples from random noise, while the Discriminator tries to distinguish real data from the fakes. They are trained simultaneously; the Generator gets better at fooling the Discriminator, and the Discriminator gets better at spotting discrepancies.',
      what_went_well: ['Correct adversarial process explanation', 'Mentioned minimax game'],
      what_could_be_better: ['Mention common issues like mode collapse'],
      recommended_response: 'GANs generate new data samples through adversarial training of two competing networks.',
    },
    {
      question: 'Why is feature scaling important for certain algorithms?',
      type: 'Technical',
      score: 90,
      user_answer: 'Many machine learning algorithms rely on distance calculations or gradient descent optimization. For algorithms like K-Nearest Neighbors or SVMs, if one feature has a range of 0-1 and another ranges from 0-10,000, the latter will completely dominate. In Neural Networks, unscaled features can cause the loss surface to be elongated, leading the gradient descent optimizer to take much longer to converge.',
      what_went_well: ['Correct algorithmic impact explanation', 'Explained impact on convergence'],
      what_could_be_better: ['Differentiate between normalization and standardization'],
      recommended_response: 'Scaling ensures all features contribute equally and improves optimization stability.',
    },
    {
      question: 'Explain overfitting to a non-technical person.',
      type: 'Communication',
      score: 96,
      user_answer: 'Think of overfitting like a student who memorizes every single answer from a practice test word-for-word instead of actually understanding the concepts. When that student takes the actual exam, they fail if the questions are phrased slightly differently. In machine learning, the model "memorizes" patterns and noise in the training data rather than learning the underlying concepts.',
      what_went_well: ['Excellent analogy', 'Intuitive explanation', 'High clarity'],
      what_could_be_better: ['None'],
      recommended_response: 'The model memorizes noise instead of learning generalizable concepts.',
    },
    {
      question: 'What is Reinforcement Learning?',
      type: 'Technical',
      score: 87,
      user_answer: 'Reinforcement Learning is where an agent learns through interaction with an environment to maximize a cumulative reward. It involves States, Actions, and Transitions. Unlike supervised learning, there is no labeled dataset; the agent must discover which actions lead to the highest reward through experience, managing the exploration-exploitation dilemma.',
      what_went_well: ['Basic components covered', 'Mentioned exploration-exploitation'],
      what_could_be_better: ['Mention Policy and Value functions'],
      recommended_response: 'Learning through interaction and cumulative rewards in Markov Decision Processes.',
    },
  ],
  key_takeaways: {
    strengths: ['Strong foundational ML concepts', 'Exceptional communication', 'Clear technical structure'],
    improvements: ['Deepen Unsupervised learning depth', 'Explore mode collapse in GANs', 'Understand Policy vs Value functions'],
  },
  transcript: [
    { message_type: 'assistant', content: 'Explain the difference between L1 and L2 regularization.', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'L1 regularization, also known as Lasso, adds the absolute value of the magnitude of coefficients as a penalty term to the loss function. This diamond-shaped constraint space often forces less important coefficients to exactly zero, which naturally performs feature selection in high-dimensional datasets. On the other hand, L2 regularization, or Ridge, adds the squared magnitude of coefficients. This shrinks weights towards zero but rarely makes them exactly zero, making it more robust when many features contribute small amounts to the prediction. It effectively prevents overfitting by keeping the weight values small and preventing any single feature from dominating.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'What is the Bias-Variance tradeoff?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'The bias-variance tradeoff is a fundamental property of machine learning models. Bias represents the error from erroneous assumptions in the learning algorithm, often leading to underfitting—where the model is too simple to capture the underlying structure. Variance is the error from sensitivity to small fluctuations in the training set, leading to overfitting and learning the noise. We typically use the formula that total error equals bias-squared plus variance plus irreducible error. As we increase model complexity, bias decreases but variance increases. The goal of any data scientist is to find the sweet spot that minimizes the total error for better generalization to new, unseen data.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'How do you handle imbalanced datasets?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Handling imbalanced data requires moving beyond simple accuracy metrics. From a data perspective, we can use oversampling techniques like SMOTE—which generates synthetic examples by interpolating between existing minority samples—or random undersampling of the majority class. From an algorithmic perspective, we can employ cost-sensitive learning to penalize misclassifications of the minority class more heavily. Finally, we must evaluate using Precision-Recall curves, F1-scores, or the Area Under the ROC curve, as these provide a much more honest assessment of how well the model identifies the rare but important instances.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'Describe how a Convolutional Neural Network (CNN) works.', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Convolutional Neural Networks are specifically architected for spatial data like images. They use convolutional layers where filters or kernels slide across the input to detect specific patterns like edges or textures. These feature maps are then passed through activation functions like ReLU and then pooling layers, which reduce the spatial resolution to make the model invariant to small translations. This structure of hierarchical feature extraction allows the model to learn complex shapes from basic lines. By using local connectivity and weight sharing, CNNs significantly reduce the parameter count compared to fully connected networks.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'Explain transfer learning and its primary benefits.', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Transfer learning is the practice of leveraging a model that was pre-trained on a massive, general dataset and applying that knowledge to a smaller, more specific task. For example, we can take a ResNet model trained on millions of ImageNet photos and fine-tune it to detect specific diseases in medical X-rays. We usually freeze the early layers, which detect basic features like lines and edges, and only retrain the final layers for our specific categories. This is a game-changer because it allows us to achieve state-of-the-art performance in domains where we might only have a few hundred labeled examples.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'How do you evaluate clustering performance without labels?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Since clustering is unsupervised, we don’t have truth labels to compare against. Instead, we use internal validity metrics. The Silhouette Coefficient measures how similar a point is to its own cluster versus the nearest neighboring cluster, ranging from -1 to 1. We also look at the Within-Cluster Sum of Squares (WCSS) and use the Elbow Method—plotting WCSS against the number of clusters and looking for the "k" where the rate of improvement sharply decreases. A good cluster should have high Intra-cluster similarity and high Inter-cluster separation.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'What is the adversarial process in GANs?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Generative Adversarial Networks consist of two neural networks, a Generator and a Discriminator, that compete in a zero-sum minimax game. The Generator tries to produce realistic fake samples from random noise, while the Discriminator tries to distinguish real data from the fakes. They are trained simultaneously; the Generator gets better at fooling the Discriminator, and the Discriminator gets better at spotting discrepancies. Ideally, they reach a Nash Equilibrium where the generated data is indistinguishable from the real data distribution.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'Why is feature scaling important?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Many machine learning algorithms rely on distance calculations or gradient descent optimization. For algorithms like K-Nearest Neighbors or SVMs, if one feature has a range of 0-1 and another ranges from 0-10,000, the latter will completely dominate the distance metric. In Neural Networks, unscaled features can cause the loss surface to be highly elongated, leading the gradient descent optimizer to take much longer to converge. By standardizing features, we ensure that the model treats all inputs fairly and that the optimization process is numerically stable.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'Explain overfitting to a non-technical person.', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Think of overfitting like a student who memorizes every single answer from a practice test word-for-word instead of actually understanding the science concepts. When that student takes the actual exam, they might fail if the questions are phrased slightly differently. In machine learning, the model memorizes the specific noise and random coincidences in the training data rather than the true patterns. This results in perfect performance on the data it has seen, but very poor performance on new data.', created_at: new Date().toISOString() },
    { message_type: 'assistant', content: 'Lastly, what is Reinforcement Learning?', created_at: new Date().toISOString() },
    { message_type: 'user', content: 'Reinforcement Learning is a unique branch of ML where an agent learns through interaction with an environment to maximize a cumulative reward. It is formally modeled as a Markov Decision Process involving States, Actions, and Transitions. Unlike supervised learning, there is no labeled dataset; the agent must discover which actions lead to the highest reward through experience. This involves managing the exploration-exploitation dilemma—choosing between trying new, unknown actions or sticking with actions that have worked before.', created_at: new Date().toISOString() },
  ]
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
};

const getScoreBadge = (score: number) => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0';
  if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-0';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  return 'Needs Work';
};

// ── Score Ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 48;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          className={getScoreColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-foreground">{Math.round(score)}</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const DummyReportScreen: React.FC<DummyReportScreenProps> = ({ onTryAgain, onBackToLibrary }) => {
  const navigate = useNavigate();
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const radarData = Object.entries(DUMMY_REPORT.performance_metrics).map(([key, value]) => ({
    subject: key,
    A: value,
  }));

  const handleBack = () => {
    if (onBackToLibrary) {
      onBackToLibrary();
    } else {
      navigate('/student/mock-interview');
    }
  };

  const handleRetry = () => {
    if (onTryAgain) {
      onTryAgain();
    } else {
      navigate('/student/mock-interview');
    }
  };

  return (
    <div className="w-full space-y-6 pb-8 px-6 pt-6 bg-slate-50/30 min-h-screen">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between gap-6 pb-4 border-b">
        <div className="flex items-center gap-4 min-w-0">
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0 rounded-full" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 border-l shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Machine Learning — Report</h1>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Intermediate</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 45 mins</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> 28 Mar 2026</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={handleRetry}><RotateCcw className="h-3.5 w-3.5" /> Try Again</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> Copy Link</Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Download PDF</Button>
        </div>
      </div>

      {/* ── Hero: Score + AI Summary ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Overall Score
              <Badge className={`${getScoreBadge(DUMMY_REPORT.overall_score)} text-[10px] px-2 py-0.5`}>
                {getScoreLabel(DUMMY_REPORT.overall_score)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 space-y-6 flex flex-col items-center justify-center min-h-[220px]">
            <ScoreRing score={DUMMY_REPORT.overall_score} />
            <p className="text-xs text-center text-muted-foreground">Better than <span className="font-semibold text-foreground">72%</span> of candidates</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-8 space-y-5 min-h-[220px] flex flex-col justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed">{DUMMY_REPORT.feedback_summary}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Top Strength</p>
                </div>
                <p className="text-sm text-foreground">{DUMMY_REPORT.key_takeaways.strengths[0]}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Primary Focus</p>
                </div>
                <p className="text-sm text-foreground">{DUMMY_REPORT.key_takeaways.improvements[0]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card>
              <CardContent className="h-64 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar name="Skill" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(DUMMY_REPORT.skill_analysis).map(([skill, data], idx) => (
                <Card key={idx} className="p-4 space-y-3 border hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">{skill}</span>
                    <Badge variant="secondary">{data.score}/10</Badge>
                  </div>
                  <Progress value={data.score * 10} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{data.feedback}</p>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-3">
          {DUMMY_REPORT.question_analysis.map((q, idx) => {
            const isOpen = expandedQuestion === idx;
            return (
              <Card key={idx} className={`overflow-hidden transition-all ${isOpen ? 'ring-1 ring-primary shadow-md border-primary/30' : 'hover:shadow-sm'}`}>
                <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors" onClick={() => setExpandedQuestion(isOpen ? null : idx)}>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs bg-muted/50">{idx + 1}</div>
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getScoreBadge(q.score)} text-[10px] px-2 py-0.5`}>{q.score}%</Badge>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-2 space-y-4 border-t bg-slate-50/50">
                    <div className="p-4 bg-white rounded-lg border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Your Answer
                      </p>
                      <p className="text-sm leading-relaxed">{q.user_answer}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/30 rounded-lg border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3" /> Strengths
                        </p>
                        {q.what_went_well.map((item, i) => <p key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">• {item}</p>)}
                      </div>
                      <div className="p-4 bg-rose-50/30 rounded-lg border border-rose-100">
                        <p className="text-[10px] font-bold text-rose-700 uppercase mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-3 w-3" /> Improvements
                        </p>
                        {q.what_could_be_better.map((item, i) => <p key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">• {item}</p>)}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <ScrollArea className="h-[500px] p-6">
              <div className="space-y-4 max-w-2xl mx-auto">
                {DUMMY_REPORT.transcript.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.message_type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${msg.message_type === 'user' ? 'bg-primary text-white border-primary' : 'bg-muted border-border'}`}>
                      {msg.message_type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${msg.message_type === 'user' ? 'bg-primary text-white border-primary rounded-tr-none' : 'bg-muted/40 border-border rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DummyReportScreen;
