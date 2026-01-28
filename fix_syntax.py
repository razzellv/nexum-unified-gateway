with open('src/components/supervisor/OnShiftTeamTable.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'key=`${member.operatorId}-${idx}`}',
    'key={`${member.operatorId}-${idx}`}'
)

with open('src/components/supervisor/OnShiftTeamTable.tsx', 'w') as f:
    f.write(content)

print("Fixed!")
