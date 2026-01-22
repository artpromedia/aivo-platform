'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@aivo/ui-web';
import { useState } from 'react';
import { 
  Search, 
  MessageCircle,
  ThumbsUp,
  CheckCircle2,
  Award,
  Plus,
  Send,
  ExternalLink,
} from 'lucide-react';
import {
  useQuestions,
  useQuestion,
  useAnswers,
  useCreateQuestion,
  useCreateAnswer,
  useMarkBestAnswer,
  useToggleQuestionLike,
} from '@/hooks/use-community-support';
import type { QuestionCategory } from '@/lib/api/community-support-api';

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  answered: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export function ExpertQA() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | undefined>();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<QuestionCategory>('academic');
  const [answerContent, setAnswerContent] = useState('');

  const { data: questions, isLoading } = useQuestions({ search, category: categoryFilter });
  const { data: selectedQuestion } = useQuestion(selectedQuestionId || '');
  const { data: answers } = useAnswers(selectedQuestionId || '');
  
  const createQuestion = useCreateQuestion();
  const createAnswer = useCreateAnswer();
  const markBest = useMarkBestAnswer();
  const toggleLike = useToggleQuestionLike();

  const handleCreateQuestion = () => {
    if (!newQuestionTitle || !newQuestionContent) return;
    
    createQuestion.mutate({
      title: newQuestionTitle,
      content: newQuestionContent,
      category: newQuestionCategory,
      tags: [],
    }, {
      onSuccess: () => {
        setShowNewQuestion(false);
        setNewQuestionTitle('');
        setNewQuestionContent('');
      },
    });
  };

  const handleCreateAnswer = () => {
    if (!answerContent || !selectedQuestionId) return;
    
    createAnswer.mutate({ questionId: selectedQuestionId, content: answerContent }, {
      onSuccess: () => {
        setAnswerContent('');
      },
    });
  };

  const handleMarkBestAnswer = (answerId: string) => {
    if (!selectedQuestionId) return;
    markBest.mutate({ questionId: selectedQuestionId, answerId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expert Q&A</CardTitle>
            <Dialog open={showNewQuestion} onOpenChange={setShowNewQuestion}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ask Question
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ask the Experts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Question title..."
                    value={newQuestionTitle}
                    onChange={(e) => setNewQuestionTitle(e.target.value)}
                  />
                  <Select
                    value={newQuestionCategory}
                    onValueChange={(value) => setNewQuestionCategory(value as QuestionCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="resources">Resources</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Describe your question in detail..."
                    value={newQuestionContent}
                    onChange={(e) => setNewQuestionContent(e.target.value)}
                    rows={6}
                  />
                  <Button onClick={handleCreateQuestion} disabled={createQuestion.isPending}>
                    {createQuestion.isPending ? 'Submitting...' : 'Submit Question'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as QuestionCategory || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="resources">Resources</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading questions...</div>
      ) : (
        <div className="space-y-3">
          {questions?.map((question) => (
            <Card
              key={question.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedQuestionId(question.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={question.authorAvatar} />
                    <AvatarFallback>{question.authorName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold line-clamp-1">{question.title}</h3>
                          {question.hasExpertAnswer && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          by {question.authorName} • {new Date(question.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{question.category}</Badge>
                        <Badge className={statusColors[question.status]}>
                          {question.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {question.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{question.answerCount} answers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className={`h-4 w-4 ${question.isLiked ? 'fill-primary text-primary' : ''}`} />
                        <span>{question.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedQuestionId} onOpenChange={() => setSelectedQuestionId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedQuestion && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedQuestion.title}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedQuestion.authorAvatar} />
                        <AvatarFallback>{selectedQuestion.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-medium">{selectedQuestion.authorName}</p>
                        <p className="text-muted-foreground">
                          {new Date(selectedQuestion.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{selectedQuestion.category}</Badge>
                    <Badge className={statusColors[selectedQuestion.status]}>
                      {selectedQuestion.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">
                  {selectedQuestion.answerCount} {selectedQuestion.answerCount === 1 ? 'Answer' : 'Answers'}
                </h3>
                {answers?.map((answer) => (
                  <div
                    key={answer.id}
                    className={`p-4 rounded-lg border ${answer.isBestAnswer ? 'border-green-500 bg-green-50' : ''}`}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={answer.authorAvatar} />
                        <AvatarFallback>{answer.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{answer.authorName}</p>
                              {answer.isExpert && (
                                <Badge variant="secondary">
                                  <Award className="h-3 w-3 mr-1" />
                                  Expert
                                </Badge>
                              )}
                              {answer.isBestAnswer && (
                                <Badge variant="default">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Best Answer
                                </Badge>
                              )}
                            </div>
                            {answer.isExpert && answer.expertTitle && (
                              <p className="text-xs text-muted-foreground">
                                {answer.expertTitle}
                                {answer.expertCredentials && ` • ${answer.expertCredentials}`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(answer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!answer.isBestAnswer && selectedQuestion.authorId === 'current-user' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkBestAnswer(answer.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mark as Best
                            </Button>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap mb-3">{answer.content}</p>
                        
                        {answer.resources && answer.resources.length > 0 && (
                          <div className="mb-3 p-3 rounded-lg bg-muted">
                            <p className="text-sm font-medium mb-2">Helpful Resources:</p>
                            <div className="space-y-1">
                              {answer.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {resource.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike.mutate({ id: answer.id, type: 'answer' })}
                        >
                          <ThumbsUp className={`h-3 w-3 mr-1 ${answer.isLiked ? 'fill-primary text-primary' : ''}`} />
                          {answer.likeCount}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold">Your Answer</h3>
                <Textarea
                  placeholder="Share your answer or experience..."
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleCreateAnswer} disabled={createAnswer.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {createAnswer.isPending ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
