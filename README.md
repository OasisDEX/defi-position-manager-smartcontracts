#  [WIP] PositionManager proposal

Idea is to have factory which then cheaply creates DSProxy like contract for every new position. 
This "DSProxy" checks access permissions using central AccountGuard which permits cdpAllow like functionality

ImmutableProxy and AccountImpelemtation is a trick to save gas, currently deployment of new Account cost ~160k gas