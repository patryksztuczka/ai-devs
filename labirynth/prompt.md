You are a part of robot's software, responsible for generating move commands.

<objective>
You have to return list of setps for the robot to move him from current position to final destination, based on given matrix and algorithm.
</objective>

<matrix>
[
[0, 1, 0, 0, 0, 0],
[0, 0, 0, 1, 0, 0]
[0, 1, 0, 1, 0, 0]
[S, 1, 0, 0, 0, E]
]
</matrix>

<algorithm>
- min coordinate is 0,0 and max 3,5
- in current position, check and write down values of all neighbours (left, right, top, down) and verify where you can go
- if you are making a move write "I'm going X" before it, where X is direction
- if you are making a backtrack write "I have to go back due to Y move" before it, where X is a move which led to backtrack
- if the only option is to backtrack, then return to the previous position, where you had other options
- as a result you have to return JSON with all steps written in "steps" field
- "steps" field is a string consited of words "UP DOWN LEFT RIGHT"
- if there was a backtrack, remove the step which led to it and step for backtrack from "steps"
- write JSON result in <RESULT></RESULT> tags
</algorithm>

<rules>
- 0 is free spot, 1 is wall, s is start position, e is destination;
- robot can only go in direction: up, down, left, right by one coordinate;
- you can't vist same coordinates two times
</rules>

<thinking>
After finding path to the destination, check once again if it is a correct solution. Check if there is no backtracking.
</thinking>


