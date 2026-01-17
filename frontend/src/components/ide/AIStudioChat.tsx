/**
 * AI Studio Chat Component
 *
 * Provides chat-based recovery when AI gets stuck:
 * - Shows stuck step info with suggestions
 * - Allows user to provide hints via chat
 * - Options to skip, take over browser, or finish manually
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, Send, AlertTriangle, Lightbulb,
  SkipForward, MousePointer, Play, Loader2, X,
  HelpCircle, CheckCircle
} from 'lucide-react';
import type { StepProgress, TestCaseProgress } from '@/hooks/useAIRecorder';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'hint' | 'suggestion' | 'info' | 'success' | 'error';
}

interface AIStudioChatProps {
  testCase: TestCaseProgress | null;
  stuckStep: StepProgress | null;
  onResumeWithHint: (testCaseId: string, stepId: string, hint: string) => void;
  onSkipStep: (testCaseId: string, stepId: string) => void;
  onTakeOver: (testCaseId: string, stepId: string) => void;
  onFinishManually: (testCaseId: string) => void;
  isResolving?: boolean;
}

export function AIStudioChat({
  testCase,
  stuckStep,
  onResumeWithHint,
  onSkipStep,
  onTakeOver,
  onFinishManually,
  isResolving = false,
}: AIStudioChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add system message when step gets stuck
  useEffect(() => {
    if (stuckStep && stuckStep.status === 'stuck') {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: `I'm stuck at Step ${stuckStep.stepNumber}: "${stuckStep.description}"`,
        timestamp: new Date(),
        type: 'error',
      };

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: stuckStep.error || 'Unable to complete this step after 10 attempts.',
        timestamp: new Date(),
        type: 'info',
      };

      setMessages((prev) => {
        // Avoid duplicate messages for same step
        const hasStuckMessage = prev.some(
          (m) => m.content.includes(`Step ${stuckStep.stepNumber}:`) && m.type === 'error'
        );
        if (hasStuckMessage) return prev;
        return [...prev, systemMessage, errorMessage];
      });

      // Auto-expand and focus when stuck
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [stuckStep]);

  // Handle sending a hint
  const handleSendHint = useCallback(() => {
    if (!inputValue.trim() || !testCase || !stuckStep) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'hint',
    };

    setMessages((prev) => [...prev, userMessage]);
    onResumeWithHint(testCase.id, stuckStep.stepId, inputValue.trim());
    setInputValue('');

    // Add "retrying" message
    setTimeout(() => {
      const retryMessage: ChatMessage = {
        id: `retry-${Date.now()}`,
        role: 'assistant',
        content: 'Got it! Retrying with your guidance...',
        timestamp: new Date(),
        type: 'info',
      };
      setMessages((prev) => [...prev, retryMessage]);
    }, 100);
  }, [inputValue, testCase, stuckStep, onResumeWithHint]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (!testCase || !stuckStep) return;

      if (suggestion.toLowerCase().includes('skip')) {
        onSkipStep(testCase.id, stuckStep.stepId);
        const skipMessage: ChatMessage = {
          id: `skip-${Date.now()}`,
          role: 'user',
          content: 'Skip this step',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, skipMessage]);
      } else if (suggestion.toLowerCase().includes('manual')) {
        onTakeOver(testCase.id, stuckStep.stepId);
        const takeOverMessage: ChatMessage = {
          id: `takeover-${Date.now()}`,
          role: 'user',
          content: 'Let me do it manually',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, takeOverMessage]);
      } else {
        // Use as hint
        setInputValue(suggestion);
        inputRef.current?.focus();
      }
    },
    [testCase, stuckStep, onSkipStep, onTakeOver]
  );

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendHint();
      }
    },
    [handleSendHint]
  );

  // Clear messages when test case changes
  useEffect(() => {
    if (!testCase) {
      setMessages([]);
    }
  }, [testCase?.id]);

  // Add success message when step is resolved
  useEffect(() => {
    if (stuckStep && (stuckStep.status === 'resolved' || stuckStep.status === 'captured')) {
      const successMessage: ChatMessage = {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: `Step ${stuckStep.stepNumber} completed successfully! Continuing with the next step...`,
        timestamp: new Date(),
        type: 'success',
      };
      setMessages((prev) => [...prev, successMessage]);
    }
  }, [stuckStep?.status]);

  if (!isExpanded) {
    return (
      <button
        className="chat-collapsed"
        onClick={() => setIsExpanded(true)}
        title="Open AI Chat"
      >
        <MessageCircle size={18} />
        {stuckStep && stuckStep.status === 'stuck' && (
          <span className="chat-badge">!</span>
        )}
      </button>
    );
  }

  return (
    <div className="ai-studio-chat">
      <div className="chat-header">
        <div className="chat-title">
          <MessageCircle size={16} />
          <span>AI Assistant</span>
          {isResolving && <Loader2 size={14} className="spin" />}
        </div>
        <button
          className="chat-minimize"
          onClick={() => setIsExpanded(false)}
          title="Minimize"
        >
          <X size={16} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !stuckStep && (
          <div className="chat-empty">
            <HelpCircle size={32} />
            <p>AI assistant is ready to help</p>
            <span>I'll ask for your guidance if I get stuck on any step</span>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role} ${msg.type || ''}`}>
            {msg.role === 'assistant' && msg.type === 'error' && (
              <AlertTriangle size={14} className="message-icon" />
            )}
            {msg.role === 'assistant' && msg.type === 'success' && (
              <CheckCircle size={14} className="message-icon success" />
            )}
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {/* Suggestions when stuck */}
        {stuckStep && stuckStep.status === 'stuck' && stuckStep.suggestions && (
          <div className="chat-suggestions">
            <div className="suggestions-header">
              <Lightbulb size={14} />
              <span>Suggestions:</span>
            </div>
            <div className="suggestions-list">
              {stuckStep.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isResolving}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick action buttons when stuck */}
        {stuckStep && stuckStep.status === 'stuck' && testCase && (
          <div className="chat-quick-actions">
            <button
              className="quick-action"
              onClick={() => onTakeOver(testCase.id, stuckStep.stepId)}
              disabled={isResolving}
              title="Click in the browser to complete this step"
            >
              <MousePointer size={14} />
              Take Over
            </button>
            <button
              className="quick-action"
              onClick={() => onSkipStep(testCase.id, stuckStep.stepId)}
              disabled={isResolving}
              title="Skip this step and continue"
            >
              <SkipForward size={14} />
              Skip Step
            </button>
            <button
              className="quick-action"
              onClick={() => onFinishManually(testCase.id)}
              disabled={isResolving}
              title="Record remaining steps manually"
            >
              <Play size={14} />
              Finish Manually
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            stuckStep?.status === 'stuck'
              ? 'Type a hint to help me...'
              : 'Ask for help or guidance...'
          }
          disabled={isResolving || !stuckStep || stuckStep.status !== 'stuck'}
        />
        <button
          className="chat-send"
          onClick={handleSendHint}
          disabled={!inputValue.trim() || isResolving || !stuckStep || stuckStep.status !== 'stuck'}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default AIStudioChat;
