// @flow

import TBN from 'tezbridge-network/PsBabyM1'

import { GLParser, JSON2GLConvert, Mock2GLConvert, Code2GLConvert } from '../src/graph_lang'

import { SVGRenderer } from '../src/renderer/svg'
import { TextRenderer } from '../src/renderer/text'

import { Contract } from '../src/emu/contract'
import { LegacyContract } from '../src/emu/legacy/contract'

const contracts = ["accounts.tz.json","add1.tz.json","add1_list.tz.json","add_delta_timestamp.tz.json","add_timestamp_delta.tz.json","after_strategy.tz.json","always.tz.json","and.tz.json","append.tz.json","assert.tz.json","assert_cmpeq.tz.json","assert_cmpge.tz.json","assert_cmpgt.tz.json","assert_cmple.tz.json","assert_cmplt.tz.json","assert_cmpneq.tz.json","assert_eq.tz.json","assert_ge.tz.json","assert_gt.tz.json","assert_le.tz.json","assert_lt.tz.json","assert_neq.tz.json","at_least.tz.json","auction.tz.json","authentication.tz.json","bad_lockup.tz.json","balance.tz.json","big_map_entrypoints.tz.json","big_map_get_add.tz.json","big_map_magic.tz.json","big_map_mem.tz.json","big_map_to_self.tz.json","big_map_union.tz.json","build_list.tz.json","cadr_annotation.tz.json","chain_id.tz.json","check_signature.tz.json","compare.tz.json","compare_bytes.tz.json","concat.tz.json","concat_hello.tz.json","concat_list.tz.json","conditionals.tz.json","cons_twice.tz.json","contains_all.tz.json","cps_fact.tz.json","create_add1_lists.tz.json","create_contract.tz.json","data_publisher.tz.json","default_account.tz.json","delegatable_target.tz.json","diff_timestamps.tz.json","dign.tz.json","dipn.tz.json","dispatch.tz.json","dropn.tz.json","dugn.tz.json","empty.tz.json","empty_map.tz.json","exec_concat.tz.json","fail.tz.json","fail_amount.tz.json","faucet.tz.json","first.tz.json","forward.tz.json","get_map_value.tz.json","guestbook.tz.json","hardlimit.tz.json","hash_consistency_checker.tz.json","hash_key.tz.json","hash_string.tz.json","id.tz.json","if.tz.json","if_some.tz.json","infinite_loop.tz.json","insertion_sort.tz.json","int_publisher.tz.json","king_of_tez.tz.json","left_right.tz.json","list_concat.tz.json","list_concat_bytes.tz.json","list_id.tz.json","list_id_map.tz.json","list_iter.tz.json","list_map_block.tz.json","list_of_transactions.tz.json","lockup.tz.json","loop_left.tz.json","macro_annotations.tz.json","manager.tz.json","map_caddaadr.tz.json","map_car.tz.json","map_id.tz.json","map_iter.tz.json","map_size.tz.json","max_in_list.tz.json","min.tz.json","multiple_entrypoints_counter.tz.json","no_default_target.tz.json","no_entrypoint_target.tz.json","noop.tz.json","not.tz.json","or.tz.json","packunpack.tz.json","pair_id.tz.json","pair_macro.tz.json","parameterized_multisig.tz.json","pexec.tz.json","pexec_2.tz.json","queue.tz.json","reduce_map.tz.json","reentrancy.tz.json","replay.tz.json","reservoir.tz.json","ret_int.tz.json","reveal_signed_preimage.tz.json","reverse.tz.json","reverse_loop.tz.json","rooted_target.tz.json","scrutable_reservoir.tz.json","self.tz.json","set_caddaadr.tz.json","set_car.tz.json","set_cdr.tz.json","set_id.tz.json","set_iter.tz.json","set_member.tz.json","set_size.tz.json","slices.tz.json","spawn_identities.tz.json","split_bytes.tz.json","split_string.tz.json","store_input.tz.json","store_now.tz.json","str_id.tz.json","sub_timestamp_delta.tz.json","subset.tz.json","take_my_money.tz.json","tez_add_sub.tz.json","transfer_amount.tz.json","transfer_tokens.tz.json","unpair_macro.tz.json","vote_for_delegate.tz.json","weather_insurance.tz.json","xcat.tz.json","xcat_dapp.tz.json","xor.tz.json"]

async function getContract(input : Object) {
  let contract
  if (typeof input === 'string')
    contract = input
  else
    contract = contracts[input]

  console.log(`getting ${contract}`)
  const response = await fetch('/contracts/' + contract)
  const json = await response.json()
  return new Contract(json)
}

async function testContract() {
  const contract = await getContract(0)
  const init_stack_render = new TextRenderer(contract.stack)
  console.log('Init: \n' + init_stack_render.render())

  const stack = contract.walkToExit()
  const text_renderer = new TextRenderer(stack)
  console.log('Result: \n' + text_renderer.render())
  console.log(stack)

  contract.fail_stacks.forEach(stack => {
    stack.stack = stack.stack.slice(0, 1)
    const text_renderer = new TextRenderer(stack)
    console.log('Fail: \n' + text_renderer.render())
  })
  return;

  // for (let i = 0; i < 147; i++) {
  //   const contract = await getContract(i)
  //   const stack = contract.walkToExit()
  //   console.log(stack)
  // }
}



async function getLegacyContract(input : Object) {
  let contract
  if (typeof input === 'string')
    contract = input
  else
    contract = contracts[input]

  console.log(`getting ${contract}`)
  const response = await fetch('/contracts/' + contract)
  const json = await response.json()
  return new LegacyContract(json)
}

async function testLegacyContract() {
  const contract = await getLegacyContract(0)
  const stacks = contract.walkToExit()
  contract.logResult(stacks)
  return;
}

testContract()

// testLegacyContract()
