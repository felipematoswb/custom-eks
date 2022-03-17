#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CustomEksStack } from '../lib/custom-eks-stack';

const app = new cdk.App();
new CustomEksStack(app, 'CustomEksStack');