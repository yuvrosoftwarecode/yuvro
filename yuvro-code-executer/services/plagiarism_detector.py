"""
Plagiarism Detection Service
Uses multiple algorithms to detect code similarity
"""

import difflib
import re
import ast
import hashlib
from typing import Dict, List, Any, Tuple
from fuzzywuzzy import fuzz
import logging

logger = logging.getLogger(__name__)

class PlagiarismDetector:
    """Advanced plagiarism detection using multiple techniques"""
    
    def __init__(self):
        self.similarity_threshold = 0.3
        self.high_similarity_threshold = 0.7
    
    def check_similarity(self, code: str, language: str, reference_codes: List[Dict], 
                        threshold: float = None) -> Dict[str, Any]:
        """Check code similarity against reference codes"""
        
        threshold = threshold or self.similarity_threshold
        similarities = []
        max_similarity = 0.0
        
        for ref_code in reference_codes:
            similarity_score = self._calculate_similarity(
                code, ref_code.get('code', ''), language
            )
            
            if similarity_score > threshold:
                similarities.append({
                    'reference_id': ref_code.get('id'),
                    'user': ref_code.get('user', 'Unknown'),
                    'similarity_score': similarity_score,
                    'details': self._get_similarity_details(
                        code, ref_code.get('code', ''), language
                    )
                })
            
            max_similarity = max(max_similarity, similarity_score)
        
        return {
            'similarity_score': max_similarity,
            'flagged': max_similarity > self.high_similarity_threshold,
            'similar_codes': similarities,
            'analysis': self._generate_analysis(max_similarity, len(similarities))
        }
    
    def batch_check(self, submissions: List[Dict], threshold: float = None) -> Dict[str, Any]:
        """Check all submissions against each other for plagiarism"""
        
        threshold = threshold or self.similarity_threshold
        reports = []
        
        for i, submission1 in enumerate(submissions):
            for j, submission2 in enumerate(submissions[i+1:], i+1):
                similarity_score = self._calculate_similarity(
                    submission1.get('code', ''),
                    submission2.get('code', ''),
                    submission1.get('language', 'python')
                )
                
                if similarity_score > threshold:
                    reports.append({
                        'submission1_id': submission1.get('id'),
                        'submission2_id': submission2.get('id'),
                        'user1': submission1.get('user', 'Unknown'),
                        'user2': submission2.get('user', 'Unknown'),
                        'similarity_score': similarity_score,
                        'flagged': similarity_score > self.high_similarity_threshold,
                        'details': self._get_similarity_details(
                            submission1.get('code', ''),
                            submission2.get('code', ''),
                            submission1.get('language', 'python')
                        )
                    })
        
        # Sort by similarity score (highest first)
        reports.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return {
            'total_comparisons': len(submissions) * (len(submissions) - 1) // 2,
            'flagged_pairs': len([r for r in reports if r['flagged']]),
            'suspicious_pairs': len(reports),
            'reports': reports
        }
    
    def _calculate_similarity(self, code1: str, code2: str, language: str) -> float:
        """Calculate similarity using multiple algorithms"""
        
        # Normalize codes
        norm_code1 = self._normalize_code(code1, language)
        norm_code2 = self._normalize_code(code2, language)
        
        if not norm_code1 or not norm_code2:
            return 0.0
        
        # Multiple similarity measures
        similarities = []
        
        # 1. Sequence Matcher (structural similarity)
        seq_similarity = difflib.SequenceMatcher(None, norm_code1, norm_code2).ratio()
        similarities.append(seq_similarity * 0.4)  # 40% weight
        
        # 2. Fuzzy string matching
        fuzzy_similarity = fuzz.ratio(norm_code1, norm_code2) / 100.0
        similarities.append(fuzzy_similarity * 0.3)  # 30% weight
        
        # 3. Token-based similarity
        token_similarity = self._token_similarity(norm_code1, norm_code2, language)
        similarities.append(token_similarity * 0.2)  # 20% weight
        
        # 4. Structure similarity (for supported languages)
        struct_similarity = self._structure_similarity(code1, code2, language)
        similarities.append(struct_similarity * 0.1)  # 10% weight
        
        return sum(similarities)
    
    def _normalize_code(self, code: str, language: str) -> str:
        """Normalize code for comparison"""
        
        # Remove comments
        if language in ['python']:
            code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
        elif language in ['java', 'cpp', 'c', 'javascript']:
            code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Remove extra whitespace
        code = re.sub(r'\s+', ' ', code)
        
        # Remove string literals (replace with placeholder)
        code = re.sub(r'"[^"]*"', '"STRING"', code)
        code = re.sub(r"'[^']*'", "'STRING'", code)
        
        # Normalize variable names (simple approach)
        if language == 'python':
            # Replace variable names with placeholders
            code = re.sub(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', 'VAR', code)
            # Restore keywords
            keywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 
                       'import', 'from', 'return', 'print', 'len', 'range', 'int', 'str', 'list']
            for keyword in keywords:
                code = code.replace('VAR', keyword, 1) if keyword in code else code
        
        return code.strip()
    
    def _token_similarity(self, code1: str, code2: str, language: str) -> float:
        """Calculate similarity based on tokens"""
        
        # Simple tokenization
        tokens1 = set(re.findall(r'\w+', code1.lower()))
        tokens2 = set(re.findall(r'\w+', code2.lower()))
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Jaccard similarity
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        
        return intersection / union if union > 0 else 0.0
    
    def _structure_similarity(self, code1: str, code2: str, language: str) -> float:
        """Calculate structural similarity (AST-based for Python)"""
        
        if language != 'python':
            return 0.0  # Only implemented for Python
        
        try:
            # Parse ASTs
            tree1 = ast.parse(code1)
            tree2 = ast.parse(code2)
            
            # Extract structural features
            features1 = self._extract_ast_features(tree1)
            features2 = self._extract_ast_features(tree2)
            
            # Compare features
            return self._compare_features(features1, features2)
            
        except SyntaxError:
            return 0.0
    
    def _extract_ast_features(self, tree: ast.AST) -> Dict[str, int]:
        """Extract features from AST"""
        
        features = {
            'functions': 0,
            'classes': 0,
            'loops': 0,
            'conditions': 0,
            'assignments': 0,
            'calls': 0
        }
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                features['functions'] += 1
            elif isinstance(node, ast.ClassDef):
                features['classes'] += 1
            elif isinstance(node, (ast.For, ast.While)):
                features['loops'] += 1
            elif isinstance(node, ast.If):
                features['conditions'] += 1
            elif isinstance(node, ast.Assign):
                features['assignments'] += 1
            elif isinstance(node, ast.Call):
                features['calls'] += 1
        
        return features
    
    def _compare_features(self, features1: Dict[str, int], features2: Dict[str, int]) -> float:
        """Compare structural features"""
        
        total_diff = 0
        total_sum = 0
        
        for key in features1:
            val1 = features1.get(key, 0)
            val2 = features2.get(key, 0)
            total_diff += abs(val1 - val2)
            total_sum += val1 + val2
        
        if total_sum == 0:
            return 1.0
        
        return 1.0 - (total_diff / total_sum)
    
    def _get_similarity_details(self, code1: str, code2: str, language: str) -> Dict[str, Any]:
        """Get detailed similarity analysis"""
        
        norm_code1 = self._normalize_code(code1, language)
        norm_code2 = self._normalize_code(code2, language)
        
        return {
            'sequence_similarity': difflib.SequenceMatcher(None, norm_code1, norm_code2).ratio(),
            'fuzzy_similarity': fuzz.ratio(norm_code1, norm_code2) / 100.0,
            'token_similarity': self._token_similarity(norm_code1, norm_code2, language),
            'structure_similarity': self._structure_similarity(code1, code2, language),
            'common_lines': len(set(code1.split('\n')).intersection(set(code2.split('\n')))),
            'total_lines1': len(code1.split('\n')),
            'total_lines2': len(code2.split('\n'))
        }
    
    def _generate_analysis(self, max_similarity: float, similar_count: int) -> str:
        """Generate human-readable analysis"""
        
        if max_similarity > 0.9:
            return f"Very high similarity detected ({max_similarity:.1%}). Possible copy-paste."
        elif max_similarity > 0.7:
            return f"High similarity detected ({max_similarity:.1%}). Requires investigation."
        elif max_similarity > 0.5:
            return f"Moderate similarity detected ({max_similarity:.1%}). May share common patterns."
        elif max_similarity > 0.3:
            return f"Low similarity detected ({max_similarity:.1%}). Likely acceptable."
        else:
            return "No significant similarity detected."