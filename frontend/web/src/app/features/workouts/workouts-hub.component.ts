import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-workouts-hub',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './workouts-hub.component.html',
  styleUrl: './workouts-hub.component.scss'
})
export class WorkoutsHubComponent {}
