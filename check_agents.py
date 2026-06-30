import ast

with open('backend/agents/agents.py', 'r', encoding='utf-8') as f:
    content = f.read()

count = content.count('"""')
print(f'Triple-quote count: {count} ({"BALANCED" if count % 2 == 0 else "UNBALANCED!"})')

try:
    ast.parse(content)
    print('SYNTAX: OK')
except SyntaxError as e:
    lines = content.split('\n')
    print(f'SyntaxError at line {e.lineno}: {e.msg}')
    for i in range(max(0, e.lineno - 5), min(len(lines), e.lineno + 2)):
        print(f'  {i+1}: {repr(lines[i])}')
